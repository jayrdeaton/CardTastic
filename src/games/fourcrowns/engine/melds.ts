// Four Crowns' melds: the books and runs a hand can make with the round's wild cards, and the arrangement that leaves
// the fewest points in hand. Pure functions over plain cards.
//
// A book is three or more cards of a rank (with two decks, a suit can repeat); a run is three or more cards of a suit in
// a row, Aces low (A-2-3, never Q-K-A). Every card of the round's wild rank stands in for any card in either. A card
// counts once, and the hand is arranged whichever way leaves the fewest points: wilds left over once there is a meld go
// on it (a book takes any number), so only a hand with no meld at all, and one or two wilds, pays for them.

import { type Card, SUITS } from '@tastic/cards'

import { WILD_POINTS } from './types'

export function isWild(card: Card, wildRank: number): boolean {
  return card.rank === wildRank
}

/** What a card left in hand costs: Aces 1, number cards their number, Jack 11, Queen 12, King 13, a wild 20. */
export function cardPoints(card: Card, wildRank: number): number {
  return isWild(card, wildRank) ? WILD_POINTS : card.rank
}

export function handPoints(cards: readonly Card[], wildRank: number): number {
  return cards.reduce((sum, card) => sum + cardPoints(card, wildRank), 0)
}

export interface CrownsMeld {
  kind: 'book' | 'run'
  /** A run low to high, each wild in the place it fills; a book's own cards by suit, then its wilds. */
  cards: Card[]
}

/** A hand laid out: its melds, low to high, and what's left over, by rank. */
export interface CrownsArrangement {
  melds: CrownsMeld[]
  loose: Card[]
  /** What the loose cards cost. */
  points: number
}

const suitOrder = (card: Card) => SUITS.indexOf(card.suit)
const byCard = (a: Card, b: Card) => a.rank - b.rank || suitOrder(a) - suitOrder(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

type Choice = { kind: 'loose' } | { kind: 'book'; take: number[]; wilds: number } | { kind: 'run'; low: number; slots: (number | null)[]; wilds: number }

const LOOSE: Choice = { kind: 'loose' }

/** The arrangement that leaves the fewest points in hand. */
export function bestArrangement(cards: readonly Card[], wildRank: number): CrownsArrangement {
  const wilds = cards.filter((card) => isWild(card, wildRank))
  const naturals = cards.filter((card) => !isWild(card, wildRank)).sort(byCard)
  const points = naturals.map((card) => card.rank)
  // A card with a twin before it (the same rank and suit from the other deck): the search takes the first of the two,
  // so it never tries the same meld twice.
  const twinBefore = naturals.map((card, i) => (i > 0 && naturals[i - 1].rank === card.rank && naturals[i - 1].suit === card.suit ? i - 1 : -1))
  const memo = new Map<number, number>()
  const choices = new Map<number, Choice>()

  /** The first card of a suit and rank still in `mask`, or -1. */
  const natural = (mask: number, rank: number, suit: Card['suit']): number => {
    for (let j = 0; j < naturals.length; j++) if (mask & (1 << j) && naturals[j].rank === rank && naturals[j].suit === suit) return j
    return -1
  }
  /** Whether `mask` still holds a card of the suit somewhere above `rank`, up to `reach` ranks on. */
  const naturalAbove = (mask: number, rank: number, suit: Card['suit'], reach: number): boolean => {
    for (let j = 0; j < naturals.length; j++) if (mask & (1 << j) && naturals[j].suit === suit && naturals[j].rank > rank && naturals[j].rank <= rank + reach) return true
    return false
  }

  // The fewest points the cards in `mask` can leave loose, with `w` wilds to use. Each step takes the lowest card still
  // to place: left loose, the first of a book of its rank, or the lowest natural card of a run in its suit.
  const search = (mask: number, w: number): number => {
    if (mask === 0) return 0
    const key = mask * 16 + w
    const known = memo.get(key)
    if (known !== undefined) return known
    let i = 0
    while (!(mask & (1 << i))) i++
    const card = naturals[i]
    const rest = mask & ~(1 << i)
    let best = points[i] + search(rest, w)
    let choice: Choice = LOOSE

    // A book: any of the other cards of its rank, and wilds to make three.
    const others: number[] = []
    for (let j = i + 1; j < naturals.length; j++) if (rest & (1 << j) && naturals[j].rank === card.rank) others.push(j)
    for (let pick = 0; pick < 1 << others.length; pick++) {
      let ok = true
      let left = rest
      const take = [i]
      for (let k = 0; k < others.length; k++) {
        const j = others[k]
        const taken = (pick & (1 << k)) !== 0
        // Never the second of two twins without the first.
        if (taken && twinBefore[j] >= 0 && twinBefore[j] !== i && others.includes(twinBefore[j]) && !(pick & (1 << others.indexOf(twinBefore[j])))) ok = false
        if (taken) {
          left &= ~(1 << j)
          take.push(j)
        }
      }
      const need = Math.max(0, 3 - take.length)
      if (!ok || need > w) continue
      const cost = search(left, w - need)
      if (cost < best) {
        best = cost
        choice = { kind: 'book', take, wilds: need }
      }
    }

    // A run up its suit from this card: each rank above it either the natural card, if it's still to place, or a wild.
    // It ends on a natural card, and a run of two takes a wild at one end to make three.
    const slots: (number | null)[] = [i]
    const climb = (rank: number, left: number, used: number) => {
      if (rank > 13) return
      const j = natural(left, rank, card.suit)
      if (j >= 0) {
        slots.push(j)
        const next = left & ~(1 << j)
        const extra = Math.max(0, 3 - slots.length)
        if (used + extra <= w) {
          const cost = search(next, w - used - extra)
          if (cost < best) {
            best = cost
            choice = { kind: 'run', low: card.rank, slots: [...slots], wilds: used + extra }
          }
        }
        climb(rank + 1, next, used)
        slots.pop()
      }
      // A wild in this place is only worth it if a natural card of the suit can still end the run above it.
      if (used < w && naturalAbove(left, rank, card.suit, w - used)) {
        slots.push(null)
        climb(rank + 1, left, used + 1)
        slots.pop()
      }
    }
    climb(card.rank + 1, rest, 0)

    memo.set(key, best)
    choices.set(key, choice)
    return best
  }

  const all = naturals.length === 0 ? 0 : (1 << naturals.length) - 1
  search(all, wilds.length)

  // Lay the hand out along the choices made.
  const spare = [...wilds]
  const melds: CrownsMeld[] = []
  const loose: Card[] = []
  let mask = all
  let w = wilds.length
  while (mask !== 0) {
    const choice = choices.get(mask * 16 + w) ?? LOOSE
    let i = 0
    while (!(mask & (1 << i))) i++
    if (choice.kind === 'loose') {
      loose.push(naturals[i])
      mask &= ~(1 << i)
    } else if (choice.kind === 'book') {
      for (const j of choice.take) mask &= ~(1 << j)
      melds.push({ kind: 'book', cards: [...choice.take.map((j) => naturals[j]), ...spare.splice(0, choice.wilds)] })
      w -= choice.wilds
    } else {
      const run: Card[] = []
      for (const j of choice.slots) {
        if (j === null) run.push(spare.shift()!)
        else {
          run.push(naturals[j])
          mask &= ~(1 << j)
        }
      }
      // A run of two is made three with a wild above it, or below it at the King.
      let low = choice.low
      while (run.length < 3) {
        const wild = spare.shift()!
        if (low + run.length <= 13) run.push(wild)
        else {
          run.unshift(wild)
          low--
        }
      }
      melds.push({ kind: 'run', cards: run })
      w -= choice.wilds
    }
  }

  // Wilds left over go on a meld: a book first (it takes any number), else a run with room at either end. Three or more
  // with no meld make a book of their own; one or two with none are loose.
  if (spare.length > 0) {
    const book = melds.find((meld) => meld.kind === 'book')
    if (book) book.cards.push(...spare.splice(0))
    else if (melds.length > 0) {
      for (const meld of melds) {
        const first = meld.cards.findIndex((card) => !isWild(card, wildRank))
        let low = meld.cards[first].rank - first
        while (spare.length > 0 && meld.cards.length < 13) {
          if (low + meld.cards.length <= 13) meld.cards.push(spare.shift()!)
          else {
            meld.cards.unshift(spare.shift()!)
            low--
          }
        }
      }
    } else if (spare.length >= 3) melds.push({ kind: 'book', cards: spare.splice(0) })
  }
  loose.push(...spare)

  melds.sort((a, b) => firstNaturalRank(a, wildRank) - firstNaturalRank(b, wildRank))
  return { melds, loose: loose.sort(byCard), points: handPoints(loose, wildRank) }
}

function firstNaturalRank(meld: CrownsMeld, wildRank: number): number {
  return meld.cards.find((card) => !isWild(card, wildRank))?.rank ?? 14
}

/** The points a hand would leave without one of its cards (the card thrown). */
export function pointsWithout(cards: readonly Card[], cardId: string, wildRank: number): number {
  return bestArrangement(
    cards.filter((card) => card.id !== cardId),
    wildRank
  ).points
}
