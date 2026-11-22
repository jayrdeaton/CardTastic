import { configureStore } from '@reduxjs/toolkit'
import { replayRun, SOLVABLE_VARIANTS, VARIANT_IDS, type VariantId } from '@tastic/cardtastic-engine'

import WINNABLE_SEEDS from '@/constants/winnableSeeds.json'
import { hasWinnableDeals, nextDealVariant, walkWinnable, winnableSeeds, type WinnableWalk } from '@/engine/winnable'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import winnableDeals from '@/redux/winnableDealsSlice'
import { SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'
import { dealSeed } from '@/stores/winnableDeals'

import WINNABLE_RUNS from '../testUtils/winnableRuns.json'

// Winnable Deals (Jay, 2026-11-21): the seeds found ahead of time on a Mac (`npm run winnable`), how a device walks them, and
// the seed each new regular deal is dealt from.

const mockStore = configureStore({ reducer: { winnableDeals } })
// A getter, since this mock is hoisted above mockStore and read when the store module is first loaded
jest.mock('@/redux/store', () => ({
  get store() {
    return mockStore
  }
}))
let mockRandom = 0
jest.mock('@/engine/rng', () => ({ ...jest.requireActual('@/engine/rng'), randomSeed: () => mockRandom }))

describe('the winnable deals shipped in the app', () => {
  it('has at least 1,000 different seeds for every rule set the solver covers, and none for the others', () => {
    expect(Object.keys(WINNABLE_SEEDS.seeds).sort()).toEqual([...SOLVABLE_VARIANTS].sort())
    for (const variant of SOLVABLE_VARIANTS) {
      const seeds = winnableSeeds(variant)
      expect(seeds.length).toBeGreaterThanOrEqual(1000)
      expect(new Set(seeds).size).toBe(seeds.length)
      // randomSeed()'s range, so a listed seed is one a random deal could have been
      for (const seed of seeds) expect(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 31).toBe(true)
    }
    const uncovered = VARIANT_IDS.filter((variant) => !SOLVABLE_VARIANTS.includes(variant))
    expect(uncovered).toEqual(['spider-2suit', 'spider-4suit'])
    for (const variant of uncovered) expect(hasWinnableDeals(variant)).toBe(false)
  })

  // One winning run per rule set, kept when the list was found: if the rules no longer win it, the list was found on other
  // rules and needs finding again (npm run winnable)
  it("still wins one of each rule set's deals with the run the solver found, on the rules installed", () => {
    const runs = WINNABLE_RUNS as Partial<Record<VariantId, { seed: number; run: Parameters<typeof replayRun>[2] }>>
    expect(Object.keys(runs).sort()).toEqual([...SOLVABLE_VARIANTS].sort())
    for (const variant of SOLVABLE_VARIANTS) {
      const { seed, run } = runs[variant]!
      expect(winnableSeeds(variant)).toContain(seed)
      const replayed = replayRun(variant, seed, run)
      expect({ variant, ok: replayed.ok, won: replayed.ok && replayed.won }).toEqual({ variant, ok: true, won: true })
    }
  })
})

describe('walking a list', () => {
  const seeds = Array.from({ length: 50 }, (_, i) => 1000 + i)
  const walkFrom = (walk: WinnableWalk | undefined, deals: number, orders: number[]) => {
    const dealt: number[] = []
    let current = walk
    for (let i = 0; i < deals; i++) {
      const next = walkWinnable(seeds, current, () => orders.shift() ?? 99)
      dealt.push(next.seed)
      current = next.walk
    }
    return { dealt, walk: current! }
  }

  it('deals every seed once before any comes round again, then starts over in a new order', () => {
    const { dealt, walk } = walkFrom(undefined, 100, [7, 8])
    expect(new Set(dealt.slice(0, 50)).size).toBe(50)
    expect([...dealt.slice(0, 50)].sort()).toEqual(seeds)
    expect(new Set(dealt.slice(50)).size).toBe(50)
    expect(dealt.slice(50)).not.toEqual(dealt.slice(0, 50))
    expect(walk).toEqual({ order: 8, next: 50 })
  })

  it("isn't the list's own order, and two devices' orders differ", () => {
    const one = walkFrom(undefined, 50, [7]).dealt
    const two = walkFrom(undefined, 50, [12345]).dealt
    expect(one).not.toEqual(seeds)
    expect(one).not.toEqual(two)
  })

  it('carries on where a device left off, after a relaunch', () => {
    const whole = walkFrom(undefined, 50, [7]).dealt
    const after = walkFrom({ order: 7, next: 20 }, 30, []).dealt
    expect(after).toEqual(whole.slice(20))
  })

  it('starts over when a list found again is shorter than where the device had got to', () => {
    const { walk } = walkFrom({ order: 7, next: 60 }, 1, [9])
    expect(walk).toEqual({ order: 9, next: 1 })
  })
})

describe('the rule set a game deals next', () => {
  it("follows each game's rules in the player's settings", () => {
    for (const game of SOLITAIRE_GAME_IDS) expect(nextDealVariant(game, DEFAULT_SETTINGS)).toBe(game)
    const other = { ...DEFAULT_SETTINGS, klondikeDraw: 3, spiderSuits: 4, golfRankWrap: true, tripeaksRankWrap: true, canfieldDraw: 1, scorpionAssistedStock: false, fortyThievesRunMoves: true } as const
    expect(SOLITAIRE_GAME_IDS.map((game) => nextDealVariant(game, other))).toEqual(['klondike-draw3', 'spider-4suit', 'freecell', 'pyramid', 'yukon', 'golf-wrap', 'tripeaks-wrap', 'canfield-draw1', 'scorpion-classic', 'fortythieves-runs', 'acesup'])
    expect(nextDealVariant('spider', { ...DEFAULT_SETTINGS, spiderSuits: 2 })).toBe('spider-2suit')
  })
})

describe("a new deal's seed", () => {
  beforeEach(() => {
    mockRandom = 4242
  })

  it('is a random one with Winnable Deals off, and moves no walk', () => {
    const before = mockStore.getState().winnableDeals
    expect(dealSeed('klondike', false)).toBe(4242)
    expect(mockStore.getState().winnableDeals).toBe(before)
  })

  it("is the device's next winnable deal with it on, the walk kept in the store, until every deal in the list has been dealt", () => {
    const seeds = winnableSeeds('yukon')
    const dealt = Array.from({ length: seeds.length }, () => dealSeed('yukon', true))
    expect(new Set(dealt).size).toBe(seeds.length)
    expect([...dealt].sort((a, b) => a - b)).toEqual(seeds)
    expect(mockStore.getState().winnableDeals.yukon).toEqual({ order: 4242, next: seeds.length })
    // Then a new order
    mockRandom = 99
    expect(seeds).toContain(dealSeed('yukon', true))
    expect(mockStore.getState().winnableDeals.yukon).toEqual({ order: 99, next: 1 })
  })

  it('is a random one for rules with no winnable deals (2- and 4-suit Spider), even with it on', () => {
    expect(dealSeed('spider-4suit', true)).toBe(4242)
    expect(dealSeed('spider-2suit', true)).toBe(4242)
    expect(mockStore.getState().winnableDeals['spider-4suit']).toBeUndefined()
  })
})
