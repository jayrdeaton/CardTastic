import { renderHook } from '@testing-library/react-native'

import { useDailyDeal, useDealSettings } from '@/games/shared/useDailyDeal'
import { activeDailyScope, setDailyScope } from '@/stores/dailyScope'

// A play screen opened for a Daily Deal: what it deals, which save it uses, and its win going to the server as soon as it's made.

let mockParams: { daily?: string } = {}
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }))
jest.mock('@/hooks/useSettings', () => {
  const { DEFAULT_SETTINGS } = jest.requireActual('@/redux/settingsSlice')
  return { useSettings: () => ({ settings: { ...DEFAULT_SETTINGS, klondikeDraw: 3, spiderSuits: 4, autoMoveToFoundation: false } }) }
})
const mockDeal = { day: '2026-11-18', seed: 77, startedAt: '', result: null, unsent: null, refused: false }
const mockDealFor = jest.fn((_game: string, day: string) => (day === mockDeal.day ? mockDeal : null))
const mockSubmit = jest.fn((_game: string, _actions: unknown[]) => Promise.resolve())
const mockNote = jest.fn()
jest.mock('@/stores/daily', () => ({ dailyDealFor: (game: string, day: string) => mockDealFor(game, day), noteDailyInPlay: (game: string, day: string | null) => mockNote(game, day), submitDailyWin: (game: string, actions: unknown[]) => mockSubmit(game, actions) }))
const mockReminder = jest.fn()
jest.mock('@/games/shared/useDailyReminder', () => ({ useDailyReminder: (game: string, enabled: boolean) => mockReminder(game, enabled) }))

beforeEach(() => {
  mockParams = {}
  mockSubmit.mockClear()
  mockNote.mockClear()
  setDailyScope({ game: 'spider', day: 'left over', seed: 1 })
})

const session = (seed = 77) => ({ getRun: () => ({ seed, actions: ['d' as const] }) })

describe('useDailyDeal', () => {
  it('is nothing on a regular game, and clears the last screen’s scope', async () => {
    const { result } = await renderHook(() => useDailyDeal('klondike', true, session()))
    expect(result.current).toBeNull()
    expect(activeDailyScope()).toBeNull()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it("says a new Daily is out on a regular game's screen, never on a Daily's own", async () => {
    await renderHook(() => useDailyDeal('klondike', false, session()))
    expect(mockReminder).toHaveBeenLastCalledWith('klondike', true)
    mockParams = { daily: mockDeal.day }
    await renderHook(() => useDailyDeal('klondike', false, session()))
    expect(mockReminder).toHaveBeenLastCalledWith('klondike', false)
  })

  it('hands a Daily screen its deal, and scopes its saves, from the first render', async () => {
    mockParams = { daily: mockDeal.day }
    let scopeAtFirstRender: unknown
    const { result } = await renderHook(() => {
      const deal = useDailyDeal('klondike', false, session())
      scopeAtFirstRender ??= activeDailyScope()
      return deal
    })
    expect(result.current?.seed).toBe(77)
    expect(scopeAtFirstRender).toEqual({ game: 'klondike', day: mockDeal.day, seed: 77 })
  })

  it('plays a regular game if the deal was never started', async () => {
    mockParams = { daily: '2020-01-01' }
    const { result } = await renderHook(() => useDailyDeal('klondike', false, session()))
    expect(result.current).toBeNull()
    expect(activeDailyScope()).toBeNull()
  })

  it('sends the win once, the moment it is made', async () => {
    mockParams = { daily: mockDeal.day }
    const { rerender } = await renderHook(({ won }: { won: boolean }) => useDailyDeal('klondike', won, session()), { initialProps: { won: false } })
    expect(mockSubmit).not.toHaveBeenCalled()
    await rerender({ won: true })
    expect(mockSubmit).toHaveBeenCalledWith('klondike', ['d'])
    await rerender({ won: false })
    await rerender({ won: true })
    expect(mockSubmit).toHaveBeenCalledTimes(1)
  })

  it('remembers which deal the screen opened on, for a relaunch', async () => {
    mockParams = { daily: mockDeal.day }
    await renderHook(() => useDailyDeal('klondike', false, session()))
    expect(mockNote).toHaveBeenLastCalledWith('klondike', mockDeal.day)
    mockParams = {}
    await renderHook(() => useDailyDeal('klondike', false, session()))
    expect(mockNote).toHaveBeenLastCalledWith('klondike', null)
  })

  it('never sends a run of another deal', async () => {
    mockParams = { daily: mockDeal.day }
    await renderHook(() => useDailyDeal('klondike', true, session(5)))
    expect(mockSubmit).not.toHaveBeenCalled()
  })
})

describe('useDealSettings', () => {
  it('keeps the player’s rules on a regular game', async () => {
    const { result } = await renderHook(() => useDealSettings())
    expect(result.current.settings).toMatchObject({ klondikeDraw: 3, spiderSuits: 4 })
  })

  it('plays a Daily under the default rules, leaving the player’s other settings alone', async () => {
    mockParams = { daily: mockDeal.day }
    const { result } = await renderHook(() => useDealSettings())
    expect(result.current.settings).toMatchObject({ klondikeDraw: 1, spiderSuits: 1, autoMoveToFoundation: false })
  })
})
