import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32 } from '@/engine/rng'
import { cpuDrawChoice, cpuOpeningFlips, cpuPlaceChoice, placementGain } from '@/games/sixcardgolf/engine/cpu'
import { cardCount, cardValue, createGolfMatch, discardHeld, drawStock, flipOpening, gridOf, gridScore, matchWinner, nextHole, showingScore, swapInto, takeDiscard, toMove, totals } from '@/games/sixcardgolf/engine/rules'
import { type GolfState, type PlayerIndex } from '@/games/sixcardgolf/engine/types'
import { type CpuLevel } from '@/games/table/cpuLevel'

function card(rank: Rank, suit: Suit = 'clubs', faceUp = true, idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp }
}

/** Past the opening flips: player 1 to draw. */
function inPlay(state: GolfState): GolfState {
  let next = state
  for (const player of [1, 2] as const) {
    next = flipOpening(next, player, 0)!
    next = flipOpening(next, player, 4)!
  }
  return next
}

describe('scoring', () => {
  it('Ace 1, 2 minus 2, number cards their number, Jack and Queen 10, King 0', () => {
    expect([1, 2, 3, 7, 10, 11, 12, 13].map((rank) => cardValue(card(rank as Rank)))).toEqual([1, -2, 3, 7, 10, 10, 10, 0])
  })

  it('a pair in a column scores 0, even a pair of 2s', () => {
    const grid = [card(5), card(2), card(9), card(5, 'hearts'), card(2, 'hearts'), card(1)]
    expect(gridScore(grid)).toBe(0 + 0 + 10)
  })

  it('what a grid shows counts face-up cards only, and a pair only once both are up', () => {
    const grid = [card(5), card(9, 'clubs', false), card(13), card(5, 'hearts', false), card(9, 'hearts'), card(3)]
    expect(showingScore(grid)).toBe(5 + 9 + 0 + 3)
  })
})

describe('a hole', () => {
  it('deals six face-down cards each, one card on the discard, the rest the stock, and starts with the opening flips', () => {
    const state = createGolfMatch(7, 9)
    expect(gridOf(state, 1)).toHaveLength(6)
    expect(gridOf(state, 2).every((c) => !c.faceUp)).toBe(true)
    expect(state.discard).toHaveLength(1)
    expect(state.stock).toHaveLength(52 - 13)
    expect(state.phase).toBe('flip')
    expect(toMove(state)).toBeNull()
  })

  it('each player turns two cards up, in any order, then the starter draws', () => {
    let state = createGolfMatch(7, 9)
    state = flipOpening(state, 2, 1)!
    expect(flipOpening(state, 2, 1)).toBeNull()
    state = flipOpening(state, 1, 3)!
    state = flipOpening(state, 2, 2)!
    expect(flipOpening(state, 2, 5)).toBeNull()
    expect(state.phase).toBe('flip')
    state = flipOpening(state, 1, 0)!
    expect(state.phase).toBe('draw')
    expect(toMove(state)).toBe(1)
  })

  it('a card from the stock can be discarded; one from the discard has to go into the grid', () => {
    let state = inPlay(createGolfMatch(7, 9))
    const fromStock = drawStock(state, 1)!
    expect(fromStock.held?.from).toBe('stock')
    expect(discardHeld(fromStock, 1)?.turn).toBe(2)
    state = takeDiscard(state, 1)!
    expect(discardHeld(state, 1)).toBeNull()
    const top = state.held!.card
    state = swapInto(state, 1, 2)!
    expect(gridOf(state, 1)[2]).toEqual(top)
    expect(state.discard[state.discard.length - 1].faceUp).toBe(true)
    expect(state.turn).toBe(2)
  })

  it('once a player has all six up, the other has one more turn, then every card turns over and the hole is scored', () => {
    const base = inPlay(createGolfMatch(11, 9))
    // Player 1 has five up and one (index 5) down.
    let state: GolfState = { ...base, grids: [gridOf(base, 1).map((c, i) => ({ ...c, faceUp: i !== 5 })), gridOf(base, 2)] }
    state = swapInto(drawStock(state, 1)!, 1, 5)!
    expect(state.finisher).toBe(1)
    expect(state.phase).toBe('draw')
    expect(toMove(state)).toBe(2)
    state = discardHeld(drawStock(state, 2)!, 2)!
    expect(state.phase).toBe('holeOver')
    expect(state.grids.every((grid) => grid.every((c) => c.faceUp))).toBe(true)
    expect(state.scores[0]).toEqual([gridScore(gridOf(state, 1))])
    expect(state.scores[1]).toEqual([gridScore(gridOf(state, 2))])
    const next = nextHole(state)!
    expect(next.hole).toBe(2)
    expect(next.starter).toBe(2)
    expect(next.phase).toBe('flip')
  })

  it('the last hole ends the match', () => {
    const base = inPlay(createGolfMatch(11, 1))
    let state: GolfState = { ...base, grids: [gridOf(base, 1).map((c, i) => ({ ...c, faceUp: i !== 5 })), gridOf(base, 2)] }
    state = swapInto(drawStock(state, 1)!, 1, 5)!
    state = discardHeld(drawStock(state, 2)!, 2)!
    expect(state.phase).toBe('matchOver')
    expect(nextHole(state)).toBeNull()
  })

  it('an empty stock is refilled from the discard, keeping its top card', () => {
    const state = inPlay(createGolfMatch(3, 9))
    const emptied: GolfState = { ...state, stock: [], discard: [...state.stock.map((c) => ({ ...c, faceUp: true })), ...state.discard] }
    const top = emptied.discard[emptied.discard.length - 1]
    const drawn = drawStock(emptied, 1)!
    expect(drawn.discard).toEqual([top])
    expect(cardCount(drawn)).toBe(52)
  })
})

describe('the match', () => {
  it('lowest total wins; level totals are a tie', () => {
    const over = (scores: [number[], number[]]): GolfState => ({ ...createGolfMatch(1, 2), phase: 'matchOver', scores })
    expect(
      matchWinner(
        over([
          [3, 4],
          [10, 0]
        ])
      )
    ).toBe(1)
    expect(
      matchWinner(
        over([
          [3, 9],
          [10, 0]
        ])
      )
    ).toBe(2)
    expect(
      matchWinner(
        over([
          [5, 5],
          [10, 0]
        ])
      )
    ).toBeNull()
    expect(
      totals(
        over([
          [5, 5],
          [10, 0]
        ])
      )
    ).toEqual([10, 10])
  })
})

describe('the CPU', () => {
  it('turns up two cards in different columns', () => {
    const state = createGolfMatch(5, 9)
    for (let seed = 0; seed < 20; seed++) {
      const [a, b] = cpuOpeningFlips(state, 2, mulberry32(seed))
      expect(a).not.toBe(b)
      expect(a % 3).not.toBe(b % 3)
    }
  })

  it('values a pair in a column, and a King, over a high card', () => {
    const grid = [card(9), card(4, 'clubs', false), card(8, 'clubs', false), card(9, 'hearts', false), card(12), card(6, 'clubs', false)]
    // A 9 under the face-up 9 makes a pair.
    expect(placementGain(grid, 3, card(9, 'spades'))).toBeGreaterThan(placementGain(grid, 1, card(9, 'spades')))
    // A Queen is worth replacing with a King.
    expect(placementGain(grid, 4, card(13))).toBe(10)
  })

  it('takes a discard that pairs a face-up card, and swaps it there', () => {
    const base = inPlay(createGolfMatch(9, 9))
    // Its 9 is up above a face-down card; the 9 of hearts is on the discard.
    const grid = [card(9), card(4, 'clubs', false), card(8, 'clubs', false), card(6, 'spades', false), card(3, 'hearts'), card(6, 'clubs', false)]
    const state: GolfState = { ...base, turn: 2, grids: [gridOf(base, 1), grid], discard: [...base.discard, card(9, 'hearts')] }
    expect(cpuDrawChoice(state, 2, 'hard', mulberry32(1))).toBe('discard')
    expect(cpuPlaceChoice(takeDiscard(state, 2)!, 2, 'hard', mulberry32(1))).toBe(3)
  })

  it('discards a high card drawn from the stock rather than spoil a good grid', () => {
    const base = inPlay(createGolfMatch(9, 9))
    const grid = [card(1), card(13), card(2), card(1, 'hearts'), card(13, 'hearts'), card(4, 'clubs', false)]
    const state: GolfState = { ...base, turn: 2, grids: [gridOf(base, 1), grid], phase: 'place', held: { card: card(12, 'diamonds'), from: 'stock' } }
    expect(cpuPlaceChoice(state, 2, 'hard', mulberry32(1))).toBe('discard')
  })

  // Two CPUs play whole matches: every hole ends, every card stays in play, and the better player wins more often.
  function simulate(seed: number, levels: Record<PlayerIndex, CpuLevel>, holes = 3): { winner: PlayerIndex | null; turns: number } {
    const rng = mulberry32(seed ^ 0x2545f491)
    let state = createGolfMatch(seed, holes, ((seed % 2) + 1) as PlayerIndex)
    let turns = 0
    while (state.phase !== 'matchOver' && turns < 2000) {
      if (state.phase === 'holeOver') {
        state = nextHole(state)!
        continue
      }
      if (state.phase === 'flip') {
        for (const player of [1, 2] as const) for (const index of cpuOpeningFlips(state, player, rng)) state = flipOpening(state, player, index) ?? state
        continue
      }
      const player = toMove(state)!
      if (state.phase === 'draw') state = cpuDrawChoice(state, player, levels[player], rng) === 'stock' ? drawStock(state, player)! : takeDiscard(state, player)!
      else {
        const choice = cpuPlaceChoice(state, player, levels[player], rng)
        state = (choice === 'discard' ? discardHeld(state, player) : swapInto(state, player, choice))!
        turns++
      }
      expect(cardCount(state)).toBe(52)
    }
    return { winner: matchWinner(state), turns }
  }

  it('every match between two CPUs ends', () => {
    for (let seed = 0; seed < 150; seed++) expect(simulate(seed, { 1: 'medium', 2: 'medium' }).turns).toBeLessThan(2000)
  })

  it('Hard beats Easy most of the time', () => {
    const wins = { 1: 0, 2: 0 }
    for (let seed = 0; seed < 200; seed++) {
      const { winner } = simulate(seed, { 1: 'hard', 2: 'easy' })
      if (winner) wins[winner]++
    }
    expect(wins[1]).toBeGreaterThan(wins[2] * 1.5)
  })
})
