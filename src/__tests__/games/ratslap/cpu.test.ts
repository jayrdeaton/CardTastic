import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32, type RandomFn } from '@/engine/rng'
import { CPU_STYLES, type CpuLevel, cpuPlayDelayMs, cpuSlapPlan, isCpuLevel } from '@/games/ratslap/engine/cpu'
import { collectPile, createInitialState, playCard, slap, toPlay } from '@/games/ratslap/engine/rules'
import { DEFAULT_RULES, type PlayerIndex, type RatSlapRules, type RatSlapState } from '@/games/ratslap/engine/types'

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: true }
}

function makeState(overrides: Partial<RatSlapState> = {}): RatSlapState {
  return {
    rules: DEFAULT_RULES,
    hands: [[card(3, 'clubs', '-a')], [card(5, 'hearts', '-b')]],
    pile: [],
    burned: [],
    turn: 1,
    challenge: null,
    lastPlayer: null,
    pileWinner: null,
    pileWonBySlap: false,
    winner: null,
    ...overrides
  }
}

/** An rng that always returns `value`. */
const fixed =
  (value: number): RandomFn =>
  () =>
    value

const DOUBLE = [card(7, 'hearts'), card(7, 'diamonds')]
const NOTHING = [card(2, 'hearts'), card(9, 'diamonds')]

describe('isCpuLevel', () => {
  it('knows the three levels and nothing else', () => {
    expect(['easy', 'medium', 'hard'].every(isCpuLevel)).toBe(true)
    expect(isCpuLevel('expert')).toBe(false)
    expect(isCpuLevel(undefined)).toBe(false)
  })
})

describe('cpuPlayDelayMs', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s waits within its range', (level) => {
    const [min, max] = CPU_STYLES[level].playDelayMs
    expect(cpuPlayDelayMs(level, fixed(0))).toBe(min)
    expect(cpuPlayDelayMs(level, fixed(0.999999))).toBe(max)
  })

  it('gets quicker from Easy to Hard', () => {
    expect(CPU_STYLES.easy.playDelayMs[0]).toBeGreaterThan(CPU_STYLES.medium.playDelayMs[0])
    expect(CPU_STYLES.medium.playDelayMs[0]).toBeGreaterThan(CPU_STYLES.hard.playDelayMs[0])
    expect(CPU_STYLES.easy.slapDelayMs[0]).toBeGreaterThan(CPU_STYLES.medium.slapDelayMs[0])
    expect(CPU_STYLES.medium.slapDelayMs[0]).toBeGreaterThan(CPU_STYLES.hard.slapDelayMs[0])
  })
})

describe('cpuSlapPlan', () => {
  it('slaps a good pile within its reaction time, unless it misses it', () => {
    const state = makeState({ pile: DOUBLE })
    const plan = cpuSlapPlan(state, 2, 'medium', fixed(0.5))
    const [min, max] = CPU_STYLES.medium.slapDelayMs
    expect(plan?.delayMs).toBeGreaterThanOrEqual(min)
    expect(plan?.delayMs).toBeLessThanOrEqual(max)
    expect(cpuSlapPlan(state, 2, 'medium', fixed(0))).toBeNull()
  })

  it('slaps a face-card win that is still waiting, if a double is showing', () => {
    expect(cpuSlapPlan(makeState({ pile: [card(11, 'spades'), ...DOUBLE], pileWinner: 1 }), 2, 'hard', fixed(0.5))).not.toBeNull()
  })

  it('never slaps a pile that is already slapped, or once the match is over', () => {
    expect(cpuSlapPlan(makeState({ pile: DOUBLE, pileWinner: 1, pileWonBySlap: true }), 2, 'hard', fixed(0.5))).toBeNull()
    expect(cpuSlapPlan(makeState({ pile: DOUBLE, winner: 1 }), 2, 'hard', fixed(0.5))).toBeNull()
  })

  it('slaps a wrong pile only now and then, and never on Hard', () => {
    const state = makeState({ pile: NOTHING })
    expect(cpuSlapPlan(state, 2, 'easy', fixed(0))).not.toBeNull()
    expect(cpuSlapPlan(state, 2, 'easy', fixed(0.5))).toBeNull()
    expect(cpuSlapPlan(state, 2, 'hard', fixed(0))).toBeNull()
  })

  it('never slaps wrong with no card to burn, which would lose the match', () => {
    expect(cpuSlapPlan(makeState({ pile: NOTHING, hands: [[card(3)], []] }), 2, 'easy', fixed(0))).toBeNull()
  })
})

// A match between two CPUs, run on simulated time: every new pile is offered to both players' slap
// plans once, the quickest slap goes first if it beats the next card (or the collect beat), and a
// won pile is collected after the beat.
const COLLECT_BEAT_MS = 700

function simulateMatch(seed: number, rules: RatSlapRules, levels: Record<PlayerIndex, CpuLevel>, maxPlays: number): { winner: PlayerIndex | null; plays: number } {
  const rng = mulberry32(seed ^ 0x5bd1e995)
  let state = createInitialState(seed, rules, ((seed % 2) + 1) as PlayerIndex)
  let plays = 0
  let offeredKey = ''
  while (state.winner === null && plays < maxPlays) {
    const key = `${state.pile.length}:${state.pileWinner}`
    let slapper: { player: PlayerIndex; delayMs: number } | null = null
    if (key !== offeredKey) {
      offeredKey = key
      for (const player of [1, 2] as const) {
        const plan = cpuSlapPlan(state, player, levels[player], rng)
        if (plan && (!slapper || plan.delayMs < slapper.delayMs)) slapper = { player, delayMs: plan.delayMs }
      }
    }
    const mover = toPlay(state)
    const nextMs = state.pileWinner !== null || mover === null ? COLLECT_BEAT_MS : cpuPlayDelayMs(levels[mover], rng)
    if (slapper && slapper.delayMs < nextMs) {
      state = slap(state, slapper.player) ?? state
      continue
    }
    if (state.pileWinner !== null) {
      state = collectPile(state, state.pileWinner) ?? state
      offeredKey = ''
      continue
    }
    if (mover === null) break
    const next = playCard(state, mover)
    if (!next) break
    state = next
    plays++
  }
  return { winner: state.winner, plays }
}

function simulateMany(count: number, rules: RatSlapRules, levels: Record<PlayerIndex, CpuLevel>, maxPlays = 5000) {
  const wins: Record<PlayerIndex, number> = { 1: 0, 2: 0 }
  let capped = 0
  let longest = 0
  for (let seed = 1; seed <= count; seed++) {
    const { winner, plays } = simulateMatch(seed, rules, levels, maxPlays)
    if (winner === null) capped++
    else wins[winner]++
    longest = Math.max(longest, winner === null ? 0 : plays)
  }
  return { wins, capped, longest }
}

describe('whole matches between two CPUs', () => {
  it('every one of 1,000 matches ends, and each seat wins its share', () => {
    const { wins, capped } = simulateMany(1000, DEFAULT_RULES, { 1: 'medium', 2: 'medium' })
    expect(capped).toBe(0)
    expect(wins[1]).toBeGreaterThan(350)
    expect(wins[2]).toBeGreaterThan(350)
  })

  it('Hard beats Easy most of the time, and Easy still wins some', () => {
    const { wins } = simulateMany(400, DEFAULT_RULES, { 1: 'hard', 2: 'easy' })
    expect(wins[1]).toBeGreaterThan(wins[2] * 2)
    expect(wins[2]).toBeGreaterThan(0)
  })

  it.each([
    ['doubles only', { doubles: true, sandwiches: false, jokers: true }],
    ['sandwiches only', { doubles: false, sandwiches: true, jokers: true }],
    ['no jokers', { doubles: true, sandwiches: true, jokers: false }]
  ] as const)('%s: every match ends', (_label, rules) => {
    expect(simulateMany(300, rules, { 1: 'medium', 2: 'medium' }).capped).toBe(0)
  })

  it('with both slaps off (Beggar-my-Neighbour), which can go round forever, few matches reach the cap', () => {
    const { capped } = simulateMany(300, { doubles: false, sandwiches: false, jokers: true }, { 1: 'medium', 2: 'medium' })
    expect(capped).toBeLessThan(15)
  })
})
