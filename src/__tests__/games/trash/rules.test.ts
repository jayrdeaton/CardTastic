import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32 } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { cpuDrawChoice, cpuPlaceChoice } from '@/games/trash/engine/cpu'
import { canTakeDiscard, cardCount, createTrashMatch, discardHeld, drawStock, heldSpots, layoutOf, nextRound, placeHeld, spotsFor, takeDiscard, toMove } from '@/games/trash/engine/rules'
import { type PlayerIndex, type TrashState } from '@/games/trash/engine/types'

function card(rank: Rank, suit: Suit = 'clubs', faceUp = true, idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp }
}

/** A layout of `size` spots, face down, the ones in `up` filled with their own rank. */
function layout(size: number, up: number[] = []): Card[] {
  return Array.from({ length: size }, (_, i) => (up.includes(i) ? card((i + 1) as Rank, 'hearts', true, `-up${i}`) : card(((i + 3) % 13 || 13) as Rank, 'spades', false, `-down${i}`)))
}

function holding(state: TrashState, held: Card, player: PlayerIndex = 1): TrashState {
  return { ...state, turn: player, phase: 'place', held, heldFrom: 'stock' }
}

describe('spots', () => {
  it('a card goes in its own spot while it is face down or holds a Jack', () => {
    expect(spotsFor(card(4), layout(10))).toEqual([3])
    expect(spotsFor(card(4), layout(10, [3]))).toEqual([])
    const jackInFour = layout(10).map((spot, i) => (i === 3 ? card(11, 'diamonds') : spot))
    expect(spotsFor(card(4), jackInFour)).toEqual([3])
  })

  it('a Jack goes in any face-down spot; a Queen, a King, or a rank past the spots has none', () => {
    expect(spotsFor(card(11), layout(4, [0, 2]))).toEqual([1, 3])
    expect(spotsFor(card(12), layout(10))).toEqual([])
    expect(spotsFor(card(13), layout(10))).toEqual([])
    expect(spotsFor(card(7), layout(5))).toEqual([])
  })
})

describe('a turn', () => {
  it('deals ten face-down spots each, a card on the discard and the rest in the stock', () => {
    const state = createTrashMatch(3)
    expect(layoutOf(state, 1)).toHaveLength(10)
    expect(layoutOf(state, 2).every((c) => !c.faceUp)).toBe(true)
    expect(state.discard).toHaveLength(1)
    expect(cardCount(state)).toBe(52)
  })

  it('placing a card turns up the card it covers, which plays on', () => {
    const base = createTrashMatch(3)
    const state = holding({ ...base, layouts: [layout(10), layoutOf(base, 2)] }, card(4, 'diamonds'))
    const covered = layoutOf(state, 1)[3]
    const next = placeHeld(state, 1, 3)!
    expect(layoutOf(next, 1)[3]).toEqual(card(4, 'diamonds'))
    expect(next.held).toEqual({ ...covered, faceUp: true })
    expect(next.phase).toBe('place')
    expect(placeHeld(state, 1, 2)).toBeNull()
  })

  it('a card with no spot is discarded and the turn passes; one with a spot can’t be', () => {
    const base = createTrashMatch(3)
    const queen = holding(base, card(12))
    expect(heldSpots(queen)).toEqual([])
    const next = discardHeld(queen, 1)!
    expect(next.turn).toBe(2)
    expect(next.discard[next.discard.length - 1]).toEqual(card(12))
    expect(discardHeld(holding({ ...base, layouts: [layout(10), layoutOf(base, 2)] }, card(5)), 1)).toBeNull()
  })

  it('the discard can be taken only when it has a spot', () => {
    const base = createTrashMatch(3)
    const useful: TrashState = { ...base, layouts: [layout(10), layoutOf(base, 2)], discard: [card(6)] }
    expect(canTakeDiscard(useful, 1)).toBe(true)
    expect(takeDiscard(useful, 1)?.held).toEqual(card(6))
    const useless: TrashState = { ...useful, discard: [card(13)] }
    expect(takeDiscard(useless, 1)).toBeNull()
  })

  it('a card arriving at a spot a Jack holds sends the Jack on to another spot', () => {
    const base = createTrashMatch(3)
    const jackInTwo = layout(10).map((spot, i) => (i === 1 ? card(11, 'diamonds') : spot))
    const next = placeHeld(holding({ ...base, layouts: [jackInTwo, layoutOf(base, 2)] }, card(2, 'spades')), 1, 1)!
    expect(next.held).toEqual(card(11, 'diamonds'))
    expect(heldSpots(next)).not.toContain(1)
  })
})

describe('rounds', () => {
  it('filling the last spot wins the round; the winner plays the next with one spot fewer, the loser first', () => {
    const base = createTrashMatch(3)
    const state = holding({ ...base, layouts: [layout(10, [0, 1, 2, 3, 4, 5, 6, 7, 8]), layoutOf(base, 2)] }, card(10, 'diamonds'))
    const won = placeHeld(state, 1, 9)!
    expect(won.phase).toBe('roundOver')
    expect(won.roundWinner).toBe(1)
    expect(won.held).toBeNull()
    // The card the 10 covered goes to the discard.
    expect(won.discard[won.discard.length - 1]).toEqual({ ...layoutOf(state, 1)[9], faceUp: true })
    const next = nextRound(won)!
    expect(next.sizes).toEqual([9, 10])
    expect(layoutOf(next, 1)).toHaveLength(9)
    expect(next.turn).toBe(2)
    expect(next.round).toBe(2)
  })

  it('winning a round with one spot wins the match', () => {
    const base = createTrashMatch(3, 1)
    const won = placeHeld(holding(base, card(1, 'diamonds')), 1, 0)!
    expect(won.phase).toBe('matchOver')
    expect(won.winner).toBe(1)
  })

  it('an empty stock is refilled from the discard, keeping its top card', () => {
    const base = createTrashMatch(3)
    const emptied: TrashState = { ...base, stock: [], discard: [...base.stock.map((c) => ({ ...c, faceUp: true })), ...base.discard] }
    const drawn = drawStock(emptied, 1)!
    expect(drawn.discard).toEqual(base.discard)
    expect(cardCount(drawn)).toBe(52)
  })
})

describe('the CPU', () => {
  it('takes a useful discard (Hard always)', () => {
    const base = createTrashMatch(3)
    const state: TrashState = { ...base, turn: 2, layouts: [layoutOf(base, 1), layout(10)], discard: [card(6)] }
    expect(cpuDrawChoice(state, 2, 'hard', mulberry32(1))).toBe('discard')
    expect(cpuDrawChoice({ ...state, discard: [card(13)] }, 2, 'hard', mulberry32(1))).toBe('stock')
  })

  it('Hard puts a Jack in the spot whose rank it has seen most of', () => {
    const base = createTrashMatch(3)
    // Spots 2 and 7 are open; three 8s are on the discard.
    const mine = layout(10, [0, 2, 3, 4, 5, 6, 8, 9])
    const state: TrashState = { ...base, turn: 2, phase: 'place', held: card(11), heldFrom: 'stock', layouts: [layoutOf(base, 1), mine], discard: [card(8, 'hearts'), card(8, 'spades'), card(8, 'diamonds'), card(5)] }
    expect(cpuPlaceChoice(state, 'hard', mulberry32(1))).toBe(7)
  })

  // Two CPUs play whole matches: every match ends, every card stays in play.
  function simulate(seed: number, levels: Record<PlayerIndex, CpuLevel>, spots = 10): { winner: PlayerIndex | null; steps: number } {
    const rng = mulberry32(seed ^ 0x1b873593)
    let state = createTrashMatch(seed, spots, ((seed % 2) + 1) as PlayerIndex)
    let steps = 0
    while (state.phase !== 'matchOver' && steps < 20000) {
      steps++
      if (state.phase === 'roundOver') {
        state = nextRound(state)!
        continue
      }
      const player = toMove(state)!
      if (state.phase === 'draw') state = (cpuDrawChoice(state, player, levels[player], rng) === 'stock' ? drawStock(state, player) : takeDiscard(state, player))!
      else {
        const spot = cpuPlaceChoice(state, levels[player], rng)
        state = (spot === null ? discardHeld(state, player) : placeHeld(state, player, spot))!
      }
      expect(cardCount(state)).toBe(52)
    }
    return { winner: state.winner, steps }
  }

  it('every match between two CPUs ends', () => {
    for (let seed = 0; seed < 60; seed++) expect(simulate(seed, { 1: 'medium', 2: 'medium' }).winner).not.toBeNull()
    for (let seed = 0; seed < 60; seed++) expect(simulate(seed, { 1: 'easy', 2: 'hard' }, 5).winner).not.toBeNull()
  })
})

describe('Kings wild (the setup screen’s other choice)', () => {
  it('a King goes in any face-down spot and stands in for a card there; a Jack or a Queen has no spot', () => {
    expect(spotsFor(card(13), layout(4, [0, 2]), 'kings')).toEqual([1, 3])
    expect(spotsFor(card(11), layout(10), 'kings')).toEqual([])
    expect(spotsFor(card(12), layout(10), 'kings')).toEqual([])
    const kingInFour = layout(10).map((spot, i) => (i === 3 ? card(13, 'diamonds') : spot))
    expect(spotsFor(card(4), kingInFour, 'kings')).toEqual([3])
  })

  it('a match plays its rounds on the wild it was dealt with', () => {
    const state = createTrashMatch(3, 10, 1, 'kings')
    expect(state.wild).toBe('kings')
    const held = holding({ ...state, layouts: [layout(10), state.layouts[1]] }, card(13, 'hearts', true, '-k'))
    expect(heldSpots(held)).toHaveLength(10)
    const jack = holding({ ...state, layouts: [layout(10), state.layouts[1]] }, card(11, 'hearts', true, '-j'))
    expect(heldSpots(jack)).toEqual([])
    expect(discardHeld(jack, 1)!.turn).toBe(2)
  })
})
