import { type Action, configureStore, type Dispatch } from '@reduxjs/toolkit'
import { unlockedKey } from '@tastic/achievements'
import { profilesActions } from '@tastic/profile'
import { createSeatColorsReducer, seatColorsActions } from '@tastic/shell'
import { act, renderHook } from '@testing-library/react-native'
import { ReactNode } from 'react'
import { Provider } from 'react-redux'

import { SEAT_COLORS } from '@/constants/player'
import { achievementsActions } from '@/redux/achievementsSlice'
import { gameInProgressActions, type GameInProgressSlot } from '@/redux/gameInProgressSlice'
import { packReducers } from '@/redux/packReducers'
import { type PlayerSettings, playerSettingsActions } from '@/redux/playerSettingsSlice'
import { recentWinsActions } from '@/redux/recentWinsSlice'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import { topWinsActions } from '@/redux/topWinsSlice'
import { clearProfileGamesInProgress } from '@/stores/gameInProgress'
import { GameStatsProvider, useGameStats } from '@/stores/gameStats'
import { usePlayerData } from '@/stores/playerData'
import type { StatsState } from '@/stores/statsTypes'
import { DEFAULT_PROFILE_STATS, DEFAULT_STATS } from '@/stores/statsValidation'

// Saved games are covered by gameInProgress.test.ts; here only that the right player's are dropped.
jest.mock('@/stores/gameInProgress', () => ({ clearProfileGamesInProgress: jest.fn(), clearAllGamesInProgress: jest.fn() }))
let mockActiveProfileId: string | null = null
jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ profileId: mockActiveProfileId }) }))

const KID = 'profile-kid'
const DAD = 'profile-dad'
const played = { ...DEFAULT_PROFILE_STATS, currentDayStreak: 3 }
const settingsOf = (klondikeDraw: 1 | 3): PlayerSettings => ({ settings: { ...DEFAULT_SETTINGS, klondikeDraw }, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'system', blur: true } })

// The pack's own reducers (onProfileRemoved and all), and the shell's seatColors.
const { achievements, gameInProgress, playerSettings, recentWins, topWins } = packReducers

async function setup() {
  const store = configureStore({ reducer: { achievements, gameInProgress, playerSettings, recentWins, topWins, seatColors: createSeatColorsReducer(SEAT_COLORS) }, middleware: (getDefault) => getDefault({ serializableCheck: false }) })
  const stats: StatsState = { ...DEFAULT_STATS, currentDayStreak: 5, profiles: { [KID]: played, [DAD]: played } }
  store.dispatch(achievementsActions.update({ stats, unlocked: { [unlockedKey('first_win', null)]: 1, [unlockedKey('first_win', KID)]: 2, [unlockedKey('first_win', DAD)]: 3 } }))
  // @tastic/profile's action creators type their actions without RTK's index signature.
  const send = store.dispatch as Dispatch<Action>
  send(playerSettingsActions.set({ id: KID, extension: settingsOf(1) }))
  send(playerSettingsActions.set({ id: DAD, extension: settingsOf(3) }))
  send(seatColorsActions.setProfileColor({ profile: { id: KID, color: '#111111' }, color: '#abcdef' }))
  send(seatColorsActions.setProfileColor({ profile: { id: DAD, color: '#222222' }, color: '#123456' }))
  store.dispatch(gameInProgressActions.klondike.setSaved({ owner: KID, saved: { state: {}, moves: 12, elapsedSeconds: 30 } }))
  store.dispatch(gameInProgressActions.spider.setSaved({ owner: KID, saved: { state: {}, moves: 40, elapsedSeconds: 90 } }))
  store.dispatch(gameInProgressActions.klondike.setSaved({ owner: DAD, saved: { state: {}, moves: 7, elapsedSeconds: 20 } }))
  store.dispatch(recentWinsActions.add({ player: KID, variant: 'klondike', win: { score: 400, moves: 150, seconds: 250 } }))
  store.dispatch(recentWinsActions.add({ player: DAD, variant: 'klondike', win: { score: 300, moves: 120, seconds: 180 } }))
  store.dispatch(topWinsActions.add({ player: KID, variant: 'klondike', win: { score: 400, moves: 150, seconds: 250, at: null } }))
  store.dispatch(topWinsActions.add({ player: DAD, variant: 'klondike', win: { score: 300, moves: 120, seconds: 180, at: null } }))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <GameStatsProvider>{children}</GameStatsProvider>
    </Provider>
  )
  const { result } = await renderHook(() => ({ ...usePlayerData(), ...useGameStats() }), { wrapper })
  return { store, send, result }
}

const ownersOf = (slot: GameInProgressSlot) => Object.keys(slot).filter((key) => key !== '_persist')

describe('one player at a time', () => {
  beforeEach(() => jest.mocked(clearProfileGamesInProgress).mockClear())

  it("resetting a player drops their stats, achievements and saved games, and nobody else's", async () => {
    const { store, result } = await setup()

    await act(() => result.current.resetPlayer(KID))

    const { stats, unlocked } = store.getState().achievements
    expect(stats.profiles[KID]).toBeUndefined()
    expect(stats.profiles[DAD]).toEqual(played)
    // The Everyone totals keep every deal the phone has seen.
    expect(stats.currentDayStreak).toBe(5)
    expect(Object.keys(unlocked).sort()).toEqual([unlockedKey('first_win', null), unlockedKey('first_win', DAD)].sort())
    expect(clearProfileGamesInProgress).toHaveBeenCalledWith(KID)
    // Their par starts over, on expert par, and so do their records.
    expect(store.getState().recentWins).toEqual({ [DAD]: { klondike: [{ score: 300, moves: 120, seconds: 180 }] } })
    expect(Object.keys(store.getState().topWins)).toEqual([DAD])
    // Their settings and their color are still theirs.
    expect(store.getState().playerSettings[KID]?.settings.klondikeDraw).toBe(1)
    expect(store.getState().seatColors.profileColors[KID]?.color).toBe('#abcdef')
  })

  // The shell's deleteProfile dispatches @tastic/profile's remove; every reducer that keeps something per player
  // answers it (onProfileRemoved, redux/packReducers.ts). forgetPlayer, which did this by hand, is gone.
  it("a profile deleted on the Profiles screen takes everything of theirs with it, and nobody else's", async () => {
    const { store, send } = await setup()

    await act(() => void send(profilesActions.remove(KID)))

    const state = store.getState()
    expect(state.achievements.stats.profiles[KID]).toBeUndefined()
    expect(state.achievements.stats.profiles[DAD]).toEqual(played)
    expect(state.achievements.stats.currentDayStreak).toBe(5)
    expect(Object.keys(state.achievements.unlocked).sort()).toEqual([unlockedKey('first_win', null), unlockedKey('first_win', DAD)].sort())
    expect(ownersOf(state.gameInProgress.klondike)).toEqual([DAD])
    expect(ownersOf(state.gameInProgress.spider)).toEqual([])
    expect(state.recentWins[KID]).toBeUndefined()
    expect(Object.keys(state.topWins)).toEqual([DAD])
    expect(state.playerSettings[KID]).toBeUndefined()
    expect(state.playerSettings[DAD]?.settings.klondikeDraw).toBe(3)
    expect(Object.keys(state.seatColors.profileColors)).toEqual([DAD])
  })

  it('a profile deleted in a sibling app (a roster sync) leaves its data behind', async () => {
    const { store, send } = await setup()

    await act(() => void send(profilesActions.setAll([])))

    expect(store.getState().achievements.stats.profiles[KID]).toEqual(played)
    expect(ownersOf(store.getState().gameInProgress.klondike).sort()).toEqual([DAD, KID].sort())
    expect(store.getState().playerSettings[KID]).toBeDefined()
  })
})

describe("guest's own stats", () => {
  const metrics = { moves: 100, seconds: 150, score: 250, usedHint: false }

  it("keeps guest's deals, hints and undos in a bucket of their own as well as the totals, and resets them alone", async () => {
    const { store, result } = await setup()

    await act(() => void result.current.recordDealWon('freecell', metrics))
    await act(() => result.current.recordDealAbandoned('klondike', { seconds: 60, moves: 20 }))
    await act(() => result.current.recordHintUsed('klondike'))
    await act(() => result.current.recordUndoUsed('klondike'))

    const guest = store.getState().achievements.stats.profiles.guest
    expect(guest?.variants.freecell.record).toMatchObject({ played: 1, wins: 1 })
    expect(guest?.variants.klondike).toMatchObject({ record: expect.objectContaining({ played: 1, wins: 0 }), hintsUsed: 1, undosUsed: 1 })
    expect(store.getState().achievements.stats.variants.freecell.record.played).toBe(1)
    // A first win unlocks guest's own achievement, as a new profile's would.
    expect(store.getState().achievements.unlocked[unlockedKey('first_ever_win', 'guest')]).toBeDefined()

    await act(() => result.current.resetPlayer('guest'))
    expect(store.getState().achievements.stats.profiles.guest).toBeUndefined()
    expect(store.getState().achievements.stats.profiles[KID]).toEqual(played)
    expect(clearProfileGamesInProgress).toHaveBeenCalledWith('guest')
  })
})

describe("a player's par", () => {
  const metrics = (moves: number, seconds: number) => ({ moves, seconds, score: moves + seconds, usedHint: false })

  afterEach(() => {
    mockActiveProfileId = null
  })

  it('measures a win against the par from before it, then keeps it', async () => {
    mockActiveProfileId = KID
    const { store, result } = await setup()

    await act(() => void result.current.recordDealWon('klondike', metrics(140, 230)))

    // Kid's one earlier win was 400; the new one is measured against that, not against itself.
    expect(result.current.lastWin?.variant).toBe('klondike')
    expect(result.current.lastWin?.par).toEqual({ kind: 'personal', moves: 150, seconds: 250, score: 400, goldScore: null })
    expect(store.getState().recentWins[KID]?.klondike).toEqual([
      { score: 400, moves: 150, seconds: 250 },
      { score: 370, moves: 140, seconds: 230 }
    ])
    expect(store.getState().recentWins[DAD]?.klondike).toHaveLength(1)
  })

  it("files guest's wins under guest, measured against expert par at first", async () => {
    const { store, result } = await setup()

    await act(() => void result.current.recordDealWon('freecell', metrics(100, 150)))

    expect(result.current.lastWin?.par.kind).toBe('expert')
    expect(store.getState().recentWins.guest?.freecell).toEqual([{ score: 250, moves: 100, seconds: 150 }])
  })

  it('keeps the last 20 wins', async () => {
    const { store, result } = await setup()

    for (let i = 0; i < 25; i++) await act(() => void result.current.recordDealWon('golf', metrics(50, 100 + i)))

    const wins = store.getState().recentWins.guest?.golf ?? []
    expect(wins).toHaveLength(20)
    expect(wins[0].seconds).toBe(105)
    expect(wins[19].seconds).toBe(124)
  })

  it("Reset Stats on Everyone drops everyone's", async () => {
    const { store, result } = await setup()

    await act(() => result.current.resetAll())

    expect(store.getState().recentWins).toEqual({})
    expect(store.getState().topWins).toEqual({})
  })
})

describe("a player's records", () => {
  const metrics = (moves: number, seconds: number) => ({ moves, seconds, score: moves + seconds, usedHint: false })
  const kid400 = { score: 400, moves: 150, seconds: 250, at: null }

  afterEach(() => {
    mockActiveProfileId = null
  })

  it('ranks a win against their wins as they stood before it, from the boards and the stats, then keeps it on both boards with its date', async () => {
    mockActiveProfileId = KID
    const { store, result } = await setup()
    const before = Date.now()

    await act(() => void result.current.recordDealWon('klondike', metrics(140, 230)))

    // Kid's stats bucket had no wins (the setup's 400 is only on the boards), so the boards are the whole story.
    expect(result.current.lastWin?.before).toEqual({ top: { score: [kid400], time: [kid400], seen: 1 }, wins: 0, bestScore: null, bestSeconds: null })
    const boards = store.getState().topWins[KID]?.klondike
    expect(boards?.seen).toBe(2)
    expect(boards?.score.map((w) => w.score)).toEqual([370, 400])
    expect(boards?.time.map((w) => w.seconds)).toEqual([230, 250])
    expect(boards?.score[0].at).toBeGreaterThanOrEqual(before)
    expect(store.getState().topWins[DAD]?.klondike?.seen).toBe(1)
  })

  it("reads a second win's stats as they stood after the first", async () => {
    mockActiveProfileId = KID
    const { result } = await setup()

    await act(() => void result.current.recordDealWon('klondike', metrics(140, 230)))
    await act(() => void result.current.recordDealWon('klondike', metrics(160, 260)))

    expect(result.current.lastWin?.before).toMatchObject({ wins: 1, bestScore: 370, bestSeconds: 230 })
    expect(result.current.lastWin?.before.top?.seen).toBe(2)
  })
})
