import { type Card, type Rank, type Suit } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'
import { bestArrangement, cardPoints, pointsWithout } from '@/games/fourcrowns/engine/melds'

// Four Crowns' meld search: books and runs with the round's wild rank standing in for anything, arranged to leave the
// fewest points in hand.

const c = (rank: number, suit: Suit, deck = 0): Card => ({ id: `${suit}-${rank}-${deck}`, suit, rank: rank as Rank, faceUp: true })
const ids = (cards: readonly Card[]) => cards.map((card) => card.id)

describe('cardPoints', () => {
  it('an Ace is 1, a number card its number, J 11, Q 12, K 13, and a wild 20', () => {
    const wild = 5
    expect([1, 2, 10, 11, 12, 13].map((rank) => cardPoints(c(rank, 'spades'), wild))).toEqual([1, 2, 10, 11, 12, 13])
    expect(cardPoints(c(5, 'hearts'), wild)).toBe(20)
  })
})

describe('bestArrangement', () => {
  it('three of a rank make a book, and with two decks a suit can repeat', () => {
    const hand = [c(7, 'spades'), c(7, 'spades', 1), c(7, 'hearts')]
    const result = bestArrangement(hand, 3)
    expect(result.points).toBe(0)
    expect(result.melds).toEqual([{ kind: 'book', cards: expect.arrayContaining(hand) }])
  })

  it('three of a suit in a row make a run, Aces low: A-2-3 is one, Q-K-A is not', () => {
    expect(bestArrangement([c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts')], 5).points).toBe(0)
    expect(bestArrangement([c(12, 'hearts'), c(13, 'hearts'), c(1, 'hearts')], 5).points).toBe(26)
  })

  it('a run can’t hold the same card twice', () => {
    expect(bestArrangement([c(4, 'clubs'), c(4, 'clubs', 1), c(5, 'clubs')], 9).points).toBe(13)
  })

  it('a wild fills the gap in a run, in its place', () => {
    const result = bestArrangement([c(4, 'hearts'), c(6, 'hearts'), c(3, 'clubs')], 3)
    expect(result.points).toBe(0)
    expect(ids(result.melds[0].cards)).toEqual(['hearts-4-0', 'clubs-3-0', 'hearts-6-0'])
  })

  it('a wild makes two of a rank a book, and two wilds make one card a meld', () => {
    expect(bestArrangement([c(9, 'spades'), c(9, 'diamonds'), c(4, 'clubs')], 4).points).toBe(0)
    expect(bestArrangement([c(13, 'spades'), c(4, 'clubs'), c(4, 'hearts')], 4).points).toBe(0)
  })

  it('a run of two takes its wild below it at the King', () => {
    const result = bestArrangement([c(12, 'spades'), c(13, 'spades'), c(3, 'clubs')], 3)
    expect(result.points).toBe(0)
    expect(ids(result.melds[0].cards)).toEqual(['clubs-3-0', 'spades-12-0', 'spades-13-0'])
  })

  it('a wild with nothing to meld with costs 20', () => {
    const result = bestArrangement([c(13, 'spades'), c(12, 'diamonds'), c(3, 'clubs')], 3)
    expect(result.melds).toEqual([])
    expect(result.points).toBe(13 + 12 + 20)
  })

  it('wilds left over go on a meld, and three wilds alone are a book', () => {
    expect(bestArrangement([c(7, 'spades'), c(7, 'hearts'), c(7, 'diamonds'), c(3, 'clubs'), c(3, 'hearts')], 3)).toMatchObject({ points: 0, loose: [] })
    expect(bestArrangement([c(3, 'clubs'), c(3, 'hearts'), c(3, 'diamonds')], 3)).toMatchObject({ points: 0, melds: [{ kind: 'book' }] })
  })

  it('a card that fits a book or a run goes whichever way leaves fewer points', () => {
    // The 5s as a book leave the 6 and 7 of hearts (13); the 5-6-7 of hearts as a run leaves two 5s (10).
    const result = bestArrangement([c(5, 'hearts'), c(5, 'spades'), c(5, 'diamonds'), c(6, 'hearts'), c(7, 'hearts')], 3)
    expect(result.points).toBe(10)
    expect(result.melds).toEqual([{ kind: 'run', cards: [c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts')] }])
  })

  it('a wild goes where it saves the most', () => {
    // Filling 2-?-4 of hearts would leave the two 9s and the King (31); a book of 9s leaves the 2, 4 and King (19).
    expect(bestArrangement([c(2, 'hearts'), c(4, 'hearts'), c(9, 'clubs'), c(9, 'diamonds'), c(13, 'spades'), c(5, 'clubs')], 5).points).toBe(19)
  })

  it('a long hand with several wilds melds every card where it can', () => {
    // Kings wild: two runs each bridged by a wild, and two books.
    const hand = [c(1, 'spades'), c(2, 'spades'), c(4, 'spades'), c(8, 'hearts'), c(9, 'hearts'), c(11, 'hearts'), c(6, 'clubs'), c(6, 'diamonds'), c(6, 'clubs', 1), c(13, 'clubs'), c(13, 'hearts'), c(10, 'diamonds'), c(10, 'spades'), c(10, 'hearts')]
    const result = bestArrangement(hand, 13)
    expect(result.points).toBe(0)
    expect(result.melds.flatMap((meld) => meld.cards)).toHaveLength(14)
    // One wild short, the cheapest group is the one left out: the A, 2 and 4 of spades (7), not the 8, 9 and J of
    // hearts (28) or the 10s (20).
    expect(bestArrangement(hand.slice(0, 13), 13).points).toBe(7)
  })

  it('pointsWithout scores the hand left after a throw', () => {
    const hand = [c(7, 'spades'), c(7, 'hearts'), c(7, 'diamonds'), c(12, 'clubs')]
    expect(pointsWithout(hand, 'clubs-12-0', 4)).toBe(0)
    expect(pointsWithout(hand, 'spades-7-0', 4)).toBe(7 + 7 + 12)
  })

  it('agrees with a brute-force search over every way to group the cards, on random hands', () => {
    const rng = mulberry32(7)
    const deck = [...makeDeck(0), ...makeDeck(1)]
    for (let deal = 0; deal < 300; deal++) {
      const size = 3 + Math.floor(rng() * 6)
      const wild = 3 + Math.floor(rng() * 11)
      const hand = shuffle(deck, rng)
        .slice(0, size)
        .map((card) => ({ ...card, faceUp: true }))
      const result = bestArrangement(hand, wild)
      expect(result.points).toBe(bruteForcePoints(hand, wild))
      // What it lays out is what it scores, and every card is laid somewhere once.
      expect(result.loose.reduce((sum, card) => sum + cardPoints(card, wild), 0)).toBe(result.points)
      expect([...result.melds.flatMap((meld) => meld.cards), ...result.loose].map((card) => card.id).sort()).toEqual(ids(hand).sort())
      for (const meld of result.melds) expect(validMeld(meld.kind, meld.cards, wild)).toBe(true)
    }
  })

  it('finds the best arrangement of a full 14-card hand quickly', () => {
    const rng = mulberry32(42)
    const deck = [...makeDeck(0), ...makeDeck(1)]
    const start = Date.now()
    for (let deal = 0; deal < 200; deal++) {
      const hand = shuffle(deck, rng)
        .slice(0, 14)
        .map((card) => ({ ...card, faceUp: true }))
      const result = bestArrangement(hand, 13)
      expect(result.melds.flatMap((meld) => meld.cards).length + result.loose.length).toBe(14)
    }
    expect(Date.now() - start).toBeLessThan(4000)
  })
})

/** The wilds a group of natural cards needs to be a meld, or null if no number of wilds makes one. */
function wildsNeeded(group: Card[]): number | null {
  if (group.every((card) => card.rank === group[0].rank)) return Math.max(0, 3 - group.length)
  if (!group.every((card) => card.suit === group[0].suit)) return null
  const ranks = group.map((card) => card.rank).sort((a, b) => a - b)
  if (new Set(ranks).size !== ranks.length) return null
  const span = ranks[ranks.length - 1] - ranks[0] + 1
  return span - ranks.length + Math.max(0, 3 - span)
}

/** The fewest points a hand can leave, by trying every way to split its natural cards into groups. */
function bruteForcePoints(hand: Card[], wild: number): number {
  const wilds = hand.filter((card) => card.rank === wild).length
  const naturals = hand.filter((card) => card.rank !== wild)
  let best = Infinity
  const groups: Card[][] = []
  const visit = (i: number) => {
    if (i === naturals.length) {
      // Each group is a meld (paying its wilds) or loose; try every choice.
      for (let pick = 0; pick < 1 << groups.length; pick++) {
        let used = 0
        let points = 0
        let melds = 0
        let ok = true
        groups.forEach((group, g) => {
          const need = wildsNeeded(group)
          if (pick & (1 << g)) {
            if (need === null) ok = false
            else {
              used += need
              melds++
            }
          } else points += group.reduce((sum, card) => sum + card.rank, 0)
        })
        if (!ok || used > wilds) continue
        const left = wilds - used
        if (melds === 0 && left < 3) points += 20 * left
        best = Math.min(best, points)
      }
      return
    }
    for (const group of groups) {
      group.push(naturals[i])
      visit(i + 1)
      group.pop()
    }
    groups.push([naturals[i]])
    visit(i + 1)
    groups.pop()
  }
  visit(0)
  return best
}

/** Whether laid-out cards are a meld: a book of one rank, or a run of one suit in a row with each wild in a place. */
function validMeld(kind: 'book' | 'run', cards: Card[], wild: number): boolean {
  if (cards.length < 3) return false
  const naturals = cards.filter((card) => card.rank !== wild)
  if (kind === 'book') return naturals.every((card) => card.rank === naturals[0]?.rank)
  const first = cards.findIndex((card) => card.rank !== wild)
  const low = cards[first].rank - first
  if (low < 1 || low + cards.length - 1 > 13) return false
  return cards.every((card, k) => card.rank === wild || (card.suit === cards[first].suit && card.rank === low + k))
}
