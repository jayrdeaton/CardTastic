import { act, renderHook } from '@testing-library/react-native'

import { CROWNS_CPU_STEP_MS } from '@/games/fourcrowns/engine/cpu'
import { createCrownsMatch, toMove } from '@/games/fourcrowns/engine/rules'
import { type CrownsState } from '@/games/fourcrowns/engine/types'
import { useCrownsMatch } from '@/games/fourcrowns/useCrownsMatch'

// One Four Crowns match as the screen runs it: the people's moves, and each CPU one step at a time on its own timer,
// held while the deal lands and while paused.

const dice = (value: number) => () => value

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms))
const STEP = CROWNS_CPU_STEP_MS[1] + 10
const noDeal = () => 0

describe('useCrownsMatch', () => {
  it('a person’s moves are applied and told to the screen; then each CPU after them takes its turn a step at a time', async () => {
    const changed = jest.fn()
    const { result } = await renderHook(() => useCrownsMatch({ cpus: [null, 'medium', 'easy'], paused: false, dealMs: noDeal, changed, rng: dice(0.99), initialState: createCrownsMatch(7, 3) }))
    await wait(1)
    expect(toMove(result.current.state)).toBe(0)
    await act(async () => {
      result.current.draw(0)
    })
    await act(async () => {
      result.current.toss(0, result.current.state.hands[0][0].id)
    })
    expect(changed).toHaveBeenCalledTimes(2)
    expect(toMove(result.current.state)).toBe(1)
    // The CPU draws after its pause, not before.
    const afterThrow = result.current.state
    await wait(CROWNS_CPU_STEP_MS[0] - 10)
    expect(result.current.state).toBe(afterThrow)
    // Two steps each (a draw, then a throw or going out), in turn, and then it's player 1's turn again.
    for (let i = 0; i < 6 && toMove(result.current.state) !== 0; i++) await wait(STEP)
    expect(toMove(result.current.state)).toBe(0)
    expect(result.current.state.turns.slice(1).map((turn) => turn.player)).toEqual([1, 2])
  })

  it('the CPUs wait while paused, and while the deal is landing', async () => {
    const start: CrownsState = { ...createCrownsMatch(7, 2), turn: 1 }
    const { result, rerender } = await renderHook(({ paused }: { paused: boolean }) => useCrownsMatch({ cpus: [null, 'hard'], paused, dealMs: () => 2000, changed: jest.fn(), rng: dice(0.5), initialState: start }), { initialProps: { paused: true } })
    await wait(5000)
    expect(result.current.state).toBe(start)
    await rerender({ paused: false })
    await wait(STEP)
    expect(result.current.state).not.toBe(start)
  })

  it('a throw of the card just taken from the discard is refused, and Next Round only follows a finished round', async () => {
    const { result } = await renderHook(() => useCrownsMatch({ cpus: [null, null], paused: false, dealMs: noDeal, changed: jest.fn(), initialState: createCrownsMatch(7, 2) }))
    const top = result.current.state.discard[0]
    await act(async () => {
      expect(result.current.take(0)).toBe(true)
    })
    await act(async () => {
      expect(result.current.toss(0, top.id)).toBe(false)
    })
    expect(result.current.state.phase).toBe('discard')
    const before = result.current.state
    await act(async () => {
      result.current.nextRound()
    })
    expect(result.current.state).toBe(before)
  })
})
