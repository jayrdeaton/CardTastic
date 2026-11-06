import { type Card, type Rank, type Suit } from '@tastic/cards'
import { act, renderHook } from '@testing-library/react-native'

import { EIGHTS_CPU_STEP_MS } from '@/games/crazyeights/engine/cpu'
import { createEightsMatch, toMove } from '@/games/crazyeights/engine/rules'
import { DEFAULT_EIGHTS_RULES, type EightsState } from '@/games/crazyeights/engine/types'
import { CPU_REDRAW_MS, NO_PLAY_MS, useEightsMatch } from '@/games/crazyeights/useEightsMatch'

// One Crazy Eights game as the screen runs it: the people's moves, each CPU one step at a time on its own timer, a
// person's turn passing by itself once nothing fits and nothing can be drawn (but not under the pass cover), held while
// the deal lands and while paused.

const dice = (value: number) => () => value
const c = (rank: number, suit: Suit): Card => ({ id: `${suit}-${rank}-0`, suit, rank: rank as Rank, faceUp: true })

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms))
const STEP = EIGHTS_CPU_STEP_MS[1] + 10
const noDeal = () => 0

/** A game with these hands, the 9 of hearts on the discard, and nothing left to draw. */
function stuck(hands: Card[][], turn = 0): EightsState {
  const base = createEightsMatch(1, hands.length, DEFAULT_EIGHTS_RULES)
  return { ...base, hands, stock: [], discard: [c(9, 'hearts')], suit: 'hearts', turn }
}

describe('useEightsMatch', () => {
  it('a person’s card is played and told to the screen; then the CPU takes its turn after its pause', async () => {
    const changed = jest.fn()
    const base = createEightsMatch(1, 2, DEFAULT_EIGHTS_RULES)
    const start: EightsState = {
      ...base,
      hands: [
        [c(5, 'hearts'), c(3, 'clubs')],
        [c(13, 'spades'), c(4, 'clubs')]
      ],
      stock: [c(7, 'diamonds'), c(10, 'spades')],
      discard: [c(9, 'hearts')],
      suit: 'hearts',
      turn: 0
    }
    const { result } = await renderHook(() => useEightsMatch({ cpus: [null, 'medium'], rules: DEFAULT_EIGHTS_RULES, paused: false, holder: null, dealMs: noDeal, changed, rng: dice(0.99), initialState: start }))
    expect(result.current.play(0, 'clubs-3-0')).toBe(false)
    await act(async () => {
      expect(result.current.play(0, 'hearts-5-0')).toBe(true)
    })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(toMove(result.current.state)).toBe(1)
    const afterMine = result.current.state
    await wait(EIGHTS_CPU_STEP_MS[0] - 10)
    expect(result.current.state).toBe(afterMine)
    await wait(STEP)
    // Nothing of its fits the 5 of hearts, so it draws.
    expect(result.current.state.hands[1]).toHaveLength(3)
  })

  it('a person’s turn with nothing to play and nothing to draw passes by itself after a beat', async () => {
    const start = stuck([[c(3, 'clubs')], [c(4, 'spades')]])
    const { result } = await renderHook(() => useEightsMatch({ cpus: [null, null], rules: DEFAULT_EIGHTS_RULES, paused: false, holder: null, dealMs: noDeal, changed: jest.fn(), initialState: start }))
    await wait(1)
    await wait(NO_PLAY_MS - 10)
    expect(result.current.state).toBe(start)
    await wait(20)
    expect(toMove(result.current.state)).toBe(1)
  })

  it('but not while the phone is still being passed to them', async () => {
    const start = stuck([[c(3, 'clubs')], [c(4, 'spades')]], 1)
    const { result, rerender } = await renderHook(({ holder }: { holder: number }) => useEightsMatch({ cpus: [null, null], rules: DEFAULT_EIGHTS_RULES, paused: false, holder, dealMs: noDeal, changed: jest.fn(), initialState: start }), { initialProps: { holder: 0 } })
    await wait(NO_PLAY_MS * 3)
    expect(result.current.state).toBe(start)
    await rerender({ holder: 1 })
    await wait(NO_PLAY_MS + 10)
    expect(toMove(result.current.state)).toBe(0)
  })

  it('a CPU drawing card after card draws each quicker than it thinks', async () => {
    const base = createEightsMatch(1, 2, DEFAULT_EIGHTS_RULES)
    const start: EightsState = { ...base, hands: [[c(5, 'spades')], [c(3, 'clubs')]], stock: [c(7, 'diamonds'), c(10, 'hearts'), c(2, 'clubs'), c(4, 'spades')], discard: [c(9, 'hearts')], suit: 'hearts', turn: 1 }
    const { result } = await renderHook(() => useEightsMatch({ cpus: [null, 'hard'], rules: DEFAULT_EIGHTS_RULES, paused: false, holder: null, dealMs: noDeal, changed: jest.fn(), rng: dice(0.5), initialState: start }))
    await wait(1)
    await wait(STEP)
    expect(result.current.state.drawn).toBe(1)
    await wait(CPU_REDRAW_MS + 10)
    expect(result.current.state.drawn).toBe(2)
  })

  it('the CPUs wait while paused, and while the deal is landing', async () => {
    const start: EightsState = { ...createEightsMatch(7, 2, DEFAULT_EIGHTS_RULES), turn: 1 }
    const { result, rerender } = await renderHook(({ paused }: { paused: boolean }) => useEightsMatch({ cpus: [null, 'hard'], rules: DEFAULT_EIGHTS_RULES, paused, holder: null, dealMs: () => 2000, changed: jest.fn(), rng: dice(0.5), initialState: start }), { initialProps: { paused: true } })
    await wait(5000)
    expect(result.current.state).toBe(start)
    await rerender({ paused: false })
    await wait(STEP)
    expect(result.current.state).not.toBe(start)
  })
})
