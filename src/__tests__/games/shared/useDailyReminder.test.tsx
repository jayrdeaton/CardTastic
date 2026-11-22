import { configureStore } from '@reduxjs/toolkit'
import { act, renderHook } from '@testing-library/react-native'
import { router } from 'expo-router'

import daily, { type DailyState } from '@/redux/dailySlice'

// A game's new Daily Deal, said on a regular game's screen of that game (Jay, 2026-11-21): once a day, to a profile that plays the
// Dailies, and a tap deals it in place of the game on screen, whose last moves are saved first.

const TODAY = '2026-11-21'
const mockStore = { current: null as unknown as ReturnType<typeof makeStore> }
function makeStore(state: Partial<DailyState>, player: string | null = 'kid') {
  return configureStore({
    reducer: { daily, profileSelection: () => ({ 1: player, 2: null }) },
    preloadedState: { daily: { players: {}, deals: {}, playing: null, ...state } }
  })
}
jest.mock('@/redux/store', () => ({
  get store() {
    return mockStore.current
  }
}))
jest.mock('@/components/daily/useLocalDay', () => ({ useLocalDay: () => '2026-11-21' }))
const mockInfo = jest.fn()
jest.mock('@rific/toaster', () => {
  const toast = { info: (...args: unknown[]) => mockInfo(...args) }
  return { useToast: () => toast }
})
const mockStart = jest.fn()
jest.mock('@/stores/daily', () => ({ startDailyDeal: (game: string) => mockStart(game), dailyErrorText: (error: Error) => error.message }))
const mockFlush = jest.fn((_game: string) => Promise.resolve())
jest.mock('@/stores/gameInProgress', () => ({ flushGameInProgress: (game: string) => mockFlush(game) }))
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))

// Required after the mocks
const { DAILY_REMINDER_DELAY_MS, useDailyReminder } = require('@/games/shared/useDailyReminder') as typeof import('@/games/shared/useDailyReminder')

const PLAYER = { player: 'p', listed: true, shownTag: null, shownColor: null }

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms)
  })
}

describe('useDailyReminder', () => {
  it("says so once the screen has been up a moment, and once a day: it isn't said again", async () => {
    mockStore.current = makeStore({ players: { kid: PLAYER } })
    const first = await renderHook(() => useDailyReminder('klondike', true))
    expect(mockInfo).not.toHaveBeenCalled()
    await wait(DAILY_REMINDER_DELAY_MS)
    expect(mockInfo).toHaveBeenCalledTimes(1)
    expect(mockInfo.mock.lastCall![0]).toBe('New Klondike Daily Deal')
    expect(mockStore.current.getState().daily.reminded).toEqual({ kid: { klondike: TODAY } })
    await first.unmount()

    await renderHook(() => useDailyReminder('klondike', true))
    await wait(DAILY_REMINDER_DELAY_MS * 2)
    expect(mockInfo).toHaveBeenCalledTimes(1)
  })

  it("says nothing to a guest, a profile that doesn't play the Dailies, once today's is started, or on a Daily's own screen", async () => {
    for (const [state, player, enabled] of [
      [{ players: { kid: PLAYER } }, null, true],
      [{}, 'kid', true],
      [{ players: { kid: PLAYER }, deals: { kid: { klondike: { day: TODAY, seed: 1, startedAt: '', result: null, unsent: null, refused: false } } } }, 'kid', true],
      [{ players: { kid: PLAYER } }, 'kid', false]
    ] as const) {
      mockStore.current = makeStore(state as Partial<DailyState>, player)
      const view = await renderHook(() => useDailyReminder('klondike', enabled))
      await wait(DAILY_REMINDER_DELAY_MS * 2)
      await view.unmount()
    }
    expect(mockInfo).not.toHaveBeenCalled()
  })

  it("deals the Daily on a tap and puts its screen in this one's place, the game on screen saved first", async () => {
    mockStore.current = makeStore({ players: { kid: PLAYER } })
    mockStart.mockResolvedValue({ day: TODAY, seed: 9, result: null })
    await renderHook(() => useDailyReminder('spider', true))
    await wait(DAILY_REMINDER_DELAY_MS)
    const { onPress } = mockInfo.mock.lastCall![3] as { onPress: () => void }
    await act(async () => {
      onPress()
    })
    expect(mockStart).toHaveBeenCalledWith('spider')
    expect(mockFlush).toHaveBeenCalledWith('spider')
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/play/[game]', params: { game: 'spider', daily: TODAY } })
  })

  it('says so when the Daily cannot be dealt, and stays put', async () => {
    mockStore.current = makeStore({ players: { kid: PLAYER } })
    mockStart.mockRejectedValue(new Error('The Daily needs an internet connection'))
    await renderHook(() => useDailyReminder('klondike', true))
    await wait(DAILY_REMINDER_DELAY_MS)
    const { onPress } = mockInfo.mock.lastCall![3] as { onPress: () => void }
    await act(async () => {
      onPress()
    })
    expect(mockInfo).toHaveBeenLastCalledWith('The Daily needs an internet connection', undefined, undefined, { icon: 'wifi-off' })
    expect(router.replace).not.toHaveBeenCalled()
  })
})
