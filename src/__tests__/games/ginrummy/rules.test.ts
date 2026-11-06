import { type Card, type Rank, type Suit } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32 } from '@/engine/rng'
import { cpuKnocks, cpuTakesDiscard, cpuThrow } from '@/games/ginrummy/engine/cpu'
import { bestArrangement, bestDefence, candidateMelds, deadwoodPoints } from '@/games/ginrummy/engine/melds'
import { canKnock, canTakeDiscard, canThrow, cardCount, createGinMatch, drawStock, handOf, knock, nextHand, passUpcard, takeDiscard, throwCard, toMove } from '@/games/ginrummy/engine/rules'
import { type GinState, type GinTarget, type PlayerIndex } from '@/games/ginrummy/engine/types'
import { type CpuLevel } from '@/games/table/cpuLevel'

const SUIT_OF: Record<string, Suit> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }
const RANK_OF: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 }

/** Cards from short names: '7h', 'Ks', '10d'. */
function cards(...names: string[]): Card[] {
  return names.map((name) => {
    const suit = SUIT_OF[name.slice(-1)]
    const rankText = name.slice(0, -1)
    const rank = (RANK_OF[rankText] ?? Number(rankText)) as Rank
    return { id: `${suit}-${rank}-0`, suit, rank, faceUp: true }
  })
}

const names = (list: readonly Card[]) => list.map((card) => `${card.rank}${card.suit[0]}`)

/** A hand mid-turn: player 1 to throw from `hand` (eleven cards), player 2 holding `other`, with `stock` cards left. */
function throwing(hand: Card[], other: Card[], stockLeft = 20): GinState {
  const used = new Set([...hand, ...other].map((card) => card.id))
  const rest = makeDeck().filter((card) => !used.has(card.id))
  return { ...createGinMatch(1), hands: [hand, other], stock: rest.slice(0, stockLeft), discard: rest.slice(stockLeft).map((card) => ({ ...card, faceUp: true })), phase: 'discard', turn: 1, drawnFrom: 'stock', taken: null }
}

describe('melds', () => {
  it('finds sets of three or four and runs of three or more in a suit, Aces low', () => {
    const kinds = (list: string[]) => candidateMelds(cards(...list)).map((meld) => `${meld.kind}:${names(meld.cards).join(',')}`)
    expect(kinds(['7c', '7d', '7h'])).toEqual(['set:7c,7d,7h'])
    expect(kinds(['Ah', '2h', '3h'])).toEqual(['run:1h,2h,3h'])
    expect(kinds(['Qh', 'Kh', 'Ah'])).toEqual([])
    expect(kinds(['7c', '7d', '7h', '7s'])).toHaveLength(5)
    expect(kinds(['4s', '5s', '6s', '7s'])).toEqual(['run:4s,5s,6s', 'run:4s,5s,6s,7s', 'run:5s,6s,7s'])
  })

  it('counts deadwood Aces 1, number cards their number, face cards 10', () => {
    expect(deadwoodPoints(cards('Ac', '7d', '10h', 'Js', 'Qc', 'Kd'))).toBe(1 + 7 + 10 + 30)
  })

  it('uses a card in whichever meld leaves the least deadwood', () => {
    // The 7♥ fits the 7s and the run 5♥-6♥-7♥: in the run, the other two 7s are deadwood (14); in the set, the 5♥ and
    // 6♥ are (11). The set leaves less.
    const arrangement = bestArrangement(cards('7c', '7d', '7h', '5h', '6h'))
    expect(arrangement.points).toBe(11)
    expect(names(arrangement.melds[0].cards)).toEqual(['7c', '7d', '7h'])
    // With a fourth 7, the set can give up the 7♥ and keep three: everything melds.
    expect(bestArrangement(cards('7c', '7d', '7h', '7s', '5h', '6h')).points).toBe(0)
  })
})

describe('a hand', () => {
  it('deals ten each and turns up the first upcard, the non-dealer offered it first', () => {
    const state = createGinMatch(5)
    expect(state.hands.map((hand) => hand.length)).toEqual([10, 10])
    expect(state.discard).toHaveLength(1)
    expect(state.stock).toHaveLength(31)
    expect(state.phase).toBe('upcard')
    expect(state.dealer).toBe(2)
    expect(toMove(state)).toBe(1)
    expect(cardCount(state)).toBe(52)
  })

  it('both passing on the upcard sends the non-dealer to the stock', () => {
    let state = createGinMatch(5)
    expect(drawStock(state, 1)).toBeNull()
    state = passUpcard(state, 1)!
    expect(toMove(state)).toBe(2)
    expect(state.lastTurn).toMatchObject({ player: 1, took: 'pass' })
    state = passUpcard(state, 2)!
    expect(state.phase).toBe('draw')
    expect(toMove(state)).toBe(1)
    expect(canTakeDiscard(state, 1)).toBe(false)
    state = drawStock(state, 1)!
    expect(handOf(state, 1)).toHaveLength(11)
  })

  it('a card taken from the discard can’t be thrown straight back', () => {
    let state = createGinMatch(5)
    const upcard = state.discard[0]
    state = takeDiscard(state, 1)!
    expect(state.phase).toBe('discard')
    expect(canThrow(state, 1, upcard.id)).toBe(false)
    expect(throwCard(state, 1, upcard.id)).toBeNull()
    const other = handOf(state, 1).find((card) => card.id !== upcard.id)!
    state = throwCard(state, 1, other.id)!
    expect(state.lastTurn).toMatchObject({ player: 1, took: 'discard', card: upcard, threw: other })
    expect(toMove(state)).toBe(2)
    expect(state.pickups[0]).toEqual([upcard])
  })

  it('throwing with the stock down to two cards makes the hand a draw, and the same player deals again', () => {
    const hand = cards('Ac', '3d', '5h', '7s', '9c', 'Jd', 'Kh', '2s', '4c', '6d', '8h')
    const state = throwing(hand, cards('Ad', '3h', '5s', '7c', '9d', 'Jh', 'Ks', '2c', '4d', '6h'), 2)
    const done = throwCard(state, 1, hand[0].id)!
    expect(done.phase).toBe('handOver')
    expect(done.result).toMatchObject({ ending: 'wash', scorer: null, points: 0 })
    expect(nextHand(done)!.dealer).toBe(state.dealer)
  })
})

describe('knocking', () => {
  // Melds 2♣-3♣-4♣, 8♦-8♥-8♠ and 10♥-J♥-Q♥, the A♠ left over (1), and a K♣ to throw.
  const knocker = cards('2c', '3c', '4c', '8d', '8h', '8s', '10h', 'Jh', 'Qh', 'As', 'Kc')

  it('is allowed when the deadwood after the throw is 10 or less', () => {
    const state = throwing(knocker.slice(0, 11), cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'))
    expect(canKnock(state, 1, knocker[10].id)).toBe(true)
    const high = throwing([...knocker.slice(0, 6), ...cards('10h', 'Jh', 'Qs', 'Js', 'Qd')], cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'))
    expect(canKnock(high, 1, high.hands[0][10].id)).toBe(false)
  })

  it('scores the difference, the defender laying off on the knocker’s melds, a run growing a card at a time', () => {
    // The defender has K♥-K♠-K♦, then 5♣ and 6♣ (laid off on 2♣-3♣-4♣ one after the other), 9♥ (on the hearts run's
    // low end) and 4♠, 5♠, 6♦, 7♦ left over: 4 + 5 + 6 + 7 = 22.
    const state = throwing(knocker.slice(0, 11), cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'))
    const done = knock(state, 1, knocker[10].id)!
    expect(done.result).toMatchObject({ ending: 'knock', knocker: 1, scorer: 1, points: 22 - 1 })
    expect(names(done.result!.shown![1].laidOff)).toEqual(['5c', '6c', '9h'])
    expect(done.scores).toEqual([21, 0])
    expect(done.discard[done.discard.length - 1]).toMatchObject({ id: knocker[10].id, faceUp: false })
    expect(cardCount(done)).toBe(52)
  })

  it('a defender at or under the knocker’s deadwood undercuts, scoring the difference plus 25', () => {
    const knockingHand = cards('2c', '3c', '4c', '8d', '8h', '8s', '10h', 'Jh', 'Qh', '9s', 'Kc')
    const state = throwing(knockingHand, cards('5d', '6d', '7d', 'Ks', 'Kd', 'Kh', '9c', '10c', 'Jc', '3s'))
    const done = knock(state, 1, knockingHand[10].id)!
    expect(done.result).toMatchObject({ ending: 'undercut', knocker: 1, scorer: 2, points: 9 - 3 + 25 })
    expect(done.undercuts).toEqual([0, 1])
  })

  it('gin scores the other player’s deadwood plus 25, with nothing laid off', () => {
    const ginHand = cards('2c', '3c', '4c', '8d', '8h', '8s', '10h', 'Jh', 'Qh', 'Kh', 'Kc')
    const state = throwing(ginHand, cards('5c', '6c', '9h', '7h', 'Ks', 'Kd', '4s', '5s', '6d', '7d'))
    const done = knock(state, 1, ginHand[10].id)!
    expect(done.result!.ending).toBe('gin')
    expect(done.result!.shown![1].laidOff).toEqual([])
    expect(done.result!.points).toBe(done.result!.shown![1].points + 25)
    expect(done.gins).toEqual([1, 0])
  })

  it('reaching the target wins the match; otherwise the hand’s winner deals the next', () => {
    const state = throwing(knocker.slice(0, 11), cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'))
    const close = knock({ ...state, scores: [80, 0] }, 1, knocker[10].id)!
    expect(close.phase).toBe('matchOver')
    expect(close.winner).toBe(1)
    const short = knock({ ...state, target: 50 as GinTarget, scores: [30, 0] }, 1, knocker[10].id)!
    expect(short.phase).toBe('matchOver')
    const early = knock(state, 1, knocker[10].id)!
    expect(early.phase).toBe('handOver')
    const next = nextHand(early)!
    expect(next.dealer).toBe(1)
    expect(toMove(next)).toBe(2)
    expect(next.scores).toEqual([21, 0])
  })

  it('the defender keeps their own meld when that leaves less than laying off', () => {
    // The 5♣ could go on the knocker's 2♣-3♣-4♣ and the 6♣ after it, leaving 5♦ and 5♥ (10); kept in the 5s, it leaves
    // only the 6♣ (6).
    const defence = bestDefence(cards('5c', '5d', '5h', '6c'), [{ kind: 'run', cards: cards('2c', '3c', '4c') }])
    expect(defence.points).toBe(6)
    expect(defence.laidOff).toEqual([])
  })
})

describe('the CPU', () => {
  it('takes a discard that goes into a meld, and throws the card that leaves the least deadwood', () => {
    const state: GinState = { ...throwing(cards('2c', '3c', '8d', '8h', '10h', 'Jh', 'Qh', 'As', '2d', 'Kc', 'Ks'), cards('5c', '6c', '9h', 'Kh', '7s', 'Kd', '4s', '5s', '6d', '7d')), phase: 'draw', turn: 2 }
    const rng = mulberry32(1)
    const withTop = (card: Card): GinState => ({ ...state, discard: [...state.discard, card] })
    // Player 2's 4♠-5♠ wants the 6♠; a lone 2♥ is no use to it.
    expect(cpuTakesDiscard(withTop(cards('6s')[0]), 2, 'hard', rng)).toBe(true)
    expect(cpuTakesDiscard(withTop(cards('2h')[0]), 2, 'medium', rng)).toBe(false)
    const throwingState: GinState = { ...state, phase: 'discard', turn: 1 }
    expect(names([handOf(throwingState, 1).find((card) => card.id === cpuThrow(throwingState, 1, 'medium', rng))!])).toEqual(['13c'])
  })

  it('always knocks for gin; Hard holds out for less deadwood as the stock runs down', () => {
    const hand = cards('2c', '3c', '4c', '8d', '8h', '8s', '10h', 'Jh', 'Qh', 'Ac', '7s')
    const early = throwing(hand, cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'), 25)
    expect(cpuKnocks(early, 1, 'hard', hand[10].id)).toBe(true)
    const late = throwing(hand, cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '5s', '6d', '7d'), 8)
    expect(cpuKnocks(late, 1, 'hard', hand[10].id)).toBe(true)
    const lateHigh = throwing([...hand.slice(0, 9), ...cards('5d', '7s')], cards('5c', '6c', '9h', 'Kh', 'Ks', 'Kd', '4s', '6s', '6d', '7d'), 8)
    expect(cpuKnocks(lateHigh, 1, 'hard', lateHigh.hands[0][10].id)).toBe(false)
    expect(cpuKnocks(lateHigh, 1, 'medium', lateHigh.hands[0][10].id)).toBe(true)
  })

  // Two CPUs playing whole matches: every match ends, with every card accounted for after every move.
  function simulate(seed: number, levels: Record<PlayerIndex, CpuLevel>, target: GinTarget): { winner: PlayerIndex | null; hands: number } {
    const rng = mulberry32(seed ^ 0x5bd1e995)
    let state = createGinMatch(seed, target, ((seed % 2) + 1) as PlayerIndex)
    let steps = 0
    while (state.phase !== 'matchOver' && steps < 20000) {
      steps++
      if (state.phase === 'handOver') {
        state = nextHand(state)!
        continue
      }
      const player = toMove(state)!
      const level = levels[player]
      if (state.phase === 'upcard') state = (cpuTakesDiscard(state, player, level, rng) ? takeDiscard(state, player) : passUpcard(state, player))!
      else if (state.phase === 'draw') state = (canTakeDiscard(state, player) && cpuTakesDiscard(state, player, level, rng) ? takeDiscard(state, player) : drawStock(state, player))!
      else {
        const cardId = cpuThrow(state, player, level, rng)
        state = (cpuKnocks(state, player, level, cardId) ? knock(state, player, cardId) : throwCard(state, player, cardId))!
      }
      expect(cardCount(state)).toBe(52)
    }
    return { winner: state.winner, hands: state.hand }
  }

  it('every match between two CPUs ends', () => {
    for (let seed = 0; seed < 20; seed++) expect(simulate(seed, { 1: 'medium', 2: 'medium' }, 100).winner).not.toBeNull()
    for (let seed = 0; seed < 20; seed++) expect(simulate(seed, { 1: 'easy', 2: 'hard' }, 50).winner).not.toBeNull()
  })
})
