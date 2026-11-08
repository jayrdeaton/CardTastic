import { act, renderHook } from '@testing-library/react-native'

import { GIN_CPU_STEP_MS } from '@/games/ginrummy/engine/cpu'
import { createGinMatch, handOf, toMove } from '@/games/ginrummy/engine/rules'
import { DEFAULT_GIN_RULES, type GinState } from '@/games/ginrummy/engine/types'
import { useGinMatch } from '@/games/ginrummy/useGinMatch'

// One Gin Rummy match as the screen runs it: the players' moves, and the CPU in seat 2 one step at a time on its own
// timer, held while the deal lands and while paused.

/** The CPU's dice: always `value`. */
const dice = (value: number) => () => value

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms))
const STEP = GIN_CPU_STEP_MS[1] + 10

describe('useGinMatch', () => {
  it('player 1’s moves are applied and told to the screen; then the CPU takes its turn a step at a time', async () => {
    const changed = jest.fn()
    const { result } = await renderHook(() => useGinMatch({ rules: DEFAULT_GIN_RULES, cpu: 'medium', paused: false, dealMs: 0, changed, rng: dice(0.99), initialState: createGinMatch(7) }))
    await wait(1)
    expect(toMove(result.current.state)).toBe(1)
    await act(async () => {
      result.current.pass(1)
    })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(toMove(result.current.state)).toBe(2)
    // The CPU takes or passes on the upcard after its pause, not before.
    const afterPass = result.current.state
    await wait(GIN_CPU_STEP_MS[0] - 10)
    expect(result.current.state).toBe(afterPass)
    await wait(STEP)
    expect(result.current.state).not.toBe(afterPass)
    // Within a few more steps it has thrown, and it's player 1's turn again.
    for (let i = 0; i < 3 && toMove(result.current.state) !== 1; i++) await wait(STEP)
    expect(toMove(result.current.state)).toBe(1)
    expect(handOf(result.current.state, 2)).toHaveLength(10)
  })

  it('the CPU waits while paused, and while the deal is landing', async () => {
    const start: GinState = { ...createGinMatch(7), turn: 2 }
    const { result, rerender } = await renderHook(({ paused }: { paused: boolean }) => useGinMatch({ rules: DEFAULT_GIN_RULES, cpu: 'hard', paused, dealMs: 2000, changed: jest.fn(), rng: dice(0.5), initialState: start }), { initialProps: { paused: true } })
    await wait(5000)
    expect(result.current.state).toBe(start)
    await rerender({ paused: false })
    await wait(STEP)
    expect(result.current.state).not.toBe(start)
  })

  it('a throw of the card just taken from the discard is refused', async () => {
    const { result } = await renderHook(() => useGinMatch({ rules: DEFAULT_GIN_RULES, cpu: null, paused: false, dealMs: 0, changed: jest.fn(), initialState: createGinMatch(7) }))
    const upcard = result.current.state.discard[0]
    await act(async () => {
      expect(result.current.take(1)).toBe(true)
    })
    await act(async () => {
      expect(result.current.toss(1, upcard.id)).toBe(false)
    })
    expect(result.current.state.phase).toBe('discard')
  })

  // A rule changed in the match's Settings sheet "Applies to next game" (Jay, 2026-11-08): Rematch deals on the rules it's
  // handed, and keeps the last match's when handed none.
  it('a rematch plays on the rules it is handed, or the last match’s', async () => {
    const { result } = await renderHook(() => useGinMatch({ rules: DEFAULT_GIN_RULES, cpu: null, paused: false, dealMs: 0, changed: jest.fn(), initialState: createGinMatch(7) }))
    await act(async () => {
      result.current.rematch()
    })
    expect(result.current.state.rules).toEqual(DEFAULT_GIN_RULES)
    const oklahomaToFifty = { ...DEFAULT_GIN_RULES, target: 50 as const, knock: 'oklahoma' as const }
    await act(async () => {
      result.current.rematch(oklahomaToFifty)
    })
    expect(result.current.state.rules).toEqual(oklahomaToFifty)
  })
})
