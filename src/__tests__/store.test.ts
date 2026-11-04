import type { Action, Dispatch } from '@reduxjs/toolkit'
import type { Profile } from '@tastic/profile'
import * as shell from '@tastic/shell'

import { GUIDE_VERSION } from '@/constants/guide'
import { GUEST_PLAYER_ID, SEAT_COLORS } from '@/constants/player'
import { gameInProgressActions } from '@/redux/gameInProgressSlice'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import { reshapeForShell } from '@/redux/shellMigrate'
import { SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'
import { DEFAULT_PROFILE_STATS, DEFAULT_STATS } from '@/stores/statsValidation'

import { release128Actions } from '../testUtils/release128Store'

// Solitaire's store is @tastic/shell's createPackStore since the CardTastic move (pack.ts). These run the real store,
// and 1.2.8's (testUtils/release128Store.ts), through real redux-persist over the in-memory AsyncStorage mock: the keys
// it saves, the saved games kept out of the root entry, a 1.2.8 save reshaped in place, and a rollback to 1.2.8.

type StoreModule = typeof import('@/redux/store')
type Release128Module = typeof import('../testUtils/release128Store')
type Storage = Record<string, string>
type Persistor = { getState: () => { bootstrapped: boolean }; subscribe: (listener: () => void) => () => void; flush: () => Promise<unknown> }

// redux-persist keeps each key of a persisted state as its own JSON string inside the entry.
const blob = (slices: Record<string, unknown>) => JSON.stringify(Object.fromEntries([...Object.entries(slices), ['_persist', { version: -1, rehydrated: true }]].map(([key, value]) => [key, JSON.stringify(value)])))
const slicesOf = (entry: string | undefined): Record<string, unknown> => Object.fromEntries(Object.entries(JSON.parse(entry ?? '{}') as Record<string, string>).map(([key, value]) => [key, JSON.parse(value)]))

async function settle(persistor: Persistor) {
  await new Promise<void>((resolve) => {
    if (persistor.getState().bootstrapped) resolve()
    else persistor.subscribe(() => persistor.getState().bootstrapped && resolve())
  })
  // Drains redux-persist's write queues (the root entry and each game's), so what a launch wrote is on disk.
  await persistor.flush()
}

// An in-memory AsyncStorage (src/__mocks__' stand-in stores nothing). Every module registry shares one mock, so it reads
// and writes whichever disk the latest launch was handed.
let mockDisk: Storage = {}
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {
    getItem: async (key: string) => mockDisk[key] ?? null,
    setItem: async (key: string, value: string) => {
      mockDisk[key] = value
    },
    removeItem: async (key: string) => {
      delete mockDisk[key]
    },
    getAllKeys: async () => Object.keys(mockDisk)
  }
  return { __esModule: true, default: storage, ...storage }
})

// Loads `load` fresh (its own module registry, so its own reducers and persistors) over a disk seeded with `disk`.
// `storage` is that launch's disk, live; `disk` is what the launch itself left on it.
async function launchWith<T extends { persistor: Persistor }>(disk: Storage, load: () => T) {
  const storage: Storage = { ...disk }
  mockDisk = storage
  let loaded: T | undefined
  jest.isolateModules(() => {
    loaded = load()
  })
  await settle(loaded!.persistor)
  return { ...loaded!, storage, disk: { ...storage } }
}

// @tastic/profile's action creators type their actions without RTK's index signature.
const send = (store: { dispatch: unknown }, action: Action) => (store.dispatch as Dispatch<Action>)(action)

const launch = (disk: Storage = {}) => launchWith(disk, () => require('@/redux/store') as StoreModule)
const launch128 = (disk: Storage) => launchWith(disk, () => (require('../testUtils/release128Store') as Release128Module).createRelease128Store())

const dad: Profile = { id: 'profile-dad', name: 'Dad', color: '#2196f3', tag: 'DAD', createdAt: 1, updatedAt: 1 }
const kid: Profile = { id: 'profile-kid', name: 'Kid', color: '#ff9800', tag: 'KID', createdAt: 2, updatedAt: 2 }
const filed = (klondikeDraw: 1 | 3, lockOrientation: boolean) => ({ settings: { ...DEFAULT_SETTINGS, klondikeDraw, lockOrientation }, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'light', blur: false } })
const saved = (moves: number) => ({ state: { tableau: [], moves }, undoStack: [], moves, elapsedSeconds: moves * 2, foundationLayout: 1 })
const stats = { ...DEFAULT_STATS, currentDayStreak: 4, profiles: { [dad.id]: { ...DEFAULT_PROFILE_STATS, currentDayStreak: 2 } } }

// What 1.2.8 left on disk for a phone where Dad is playing with a color pick and the lock on, Kid has settings filed,
// and each has a saved deal (Dad's Klondike, guest's Spider).
const root128 = {
  theme: { appearance: 'dark', blur: true, color: '#8a3a57', harmony: 'triadic' },
  lastActiveGame: { gameId: 'klondike' },
  achievements: { stats, unlocked: { 'first_win:profile-dad': 5 } },
  recentWins: { [dad.id]: { klondike: [{ score: 300, moves: 120, seconds: 180 }] } },
  topWins: {},
  haptic: { vibrate: false },
  sound: { enabled: false },
  keepAwake: { enabled: true },
  profiles: [dad, kid],
  activeProfile: dad.id,
  // Dad's pick, guest's pick, and a pick for a profile a sibling app deleted (it had no effect, so it isn't carried).
  tableColor: { guestColor: '#009688', profileColors: { [dad.id]: '#e91e63', 'profile-gone': '#ffffff' } },
  guide: { versionSeen: GUIDE_VERSION },
  settings: { ...DEFAULT_SETTINGS, klondikeDraw: 3, lockOrientation: true, lockedRotation: 90 },
  playerSettings: { [kid.id]: filed(1, false) }
}
const disk128: Storage = {
  'solitaire:root': blob(root128),
  'solitaire:gameInProgress.klondike': blob({ [dad.id]: saved(42) }),
  'solitaire:gameInProgress.spider': blob({ [GUEST_PLAYER_ID]: saved(9) })
}

describe('the store (pack.ts)', () => {
  it("files guest under the shell's own GUEST_PLAYER_ID", () => {
    expect(GUEST_PLAYER_ID).toBe(shell.GUEST_PLAYER_ID)
  })

  it("holds the shell's keys and Solitaire's, and a fresh install saves its root entry and each game's own", async () => {
    const { store, disk } = await launch()

    expect(Object.keys(store.getState()).sort()).toEqual(['_persist', 'achievements', 'activeProfile', 'appSettings', 'gameInProgress', 'guide', 'haptic', 'keepAwake', 'lastActiveGame', 'liveplay', 'opponent', 'playerSettings', 'profileSelection', 'profiles', 'ratslapGuide', 'ratslapStats', 'recentWins', 'seatColors', 'settings', 'sound', 'tableColor', 'theme', 'topWins'].sort())
    expect(Object.keys(disk).sort()).toEqual(['solitaire:root', ...SOLITAIRE_GAME_IDS.map((id) => `solitaire:gameInProgress.${id}`)].sort())
    // Never the saved boards (their own entries) or the per-round state.
    expect(Object.keys(slicesOf(disk['solitaire:root']))).not.toEqual(expect.arrayContaining(['gameInProgress']))
    expect(Object.keys(slicesOf(disk['solitaire:root']))).not.toEqual(expect.arrayContaining(['liveplay']))
    // Seat 1 starts as guest on the pack's seat color, the theme on what that color makes.
    expect(store.getState().profileSelection).toEqual({ 1: null, 2: null })
    expect(store.getState().seatColors.lastGuestColor[1]).toBe(SEAT_COLORS[1])
    expect(store.getState().appSettings.lockOrientation).toBe(false)
    expect(store.getState().theme.harmony).toBe('triadic')
  })

  it('keeps a saved game in its own entry, out of the root entry', async () => {
    const { store, persistor, storage } = await launch()
    store.dispatch(gameInProgressActions.klondike.setSaved({ owner: GUEST_PLAYER_ID, saved: saved(3) }))
    await persistor.flush()

    expect(slicesOf(storage['solitaire:gameInProgress.klondike'])[GUEST_PLAYER_ID]).toMatchObject({ moves: 3 })
    expect(storage['solitaire:root']).not.toContain('gameInProgress')
  })
})

describe('a 1.2.8 save, reshaped in place', () => {
  it('opens with the same player, color picks, lock, settings, stats and saved games', async () => {
    const { store } = await launch(disk128)
    const state = store.getState()

    expect(state.profileSelection).toEqual({ 1: dad.id, 2: null })
    expect(state.seatColors).toEqual({ lastGuestColor: { 1: '#009688', 2: SEAT_COLORS[2] }, lastCpuColor: SEAT_COLORS[2], profileColors: { [dad.id]: { color: '#e91e63', profileColor: dad.color } } })
    expect(state.appSettings).toEqual({ lockOrientation: true, lockedRotation: 90, deferBottomEdgeGestures: false })
    expect(state.settings.klondikeDraw).toBe(3)
    expect(state.playerSettings[kid.id]).toEqual(filed(1, false))
    expect(state.sound.enabled).toBe(false)
    expect(state.haptic.vibrate).toBe(false)
    expect(state.theme).toEqual(root128.theme)
    expect(state.guide.versionSeen).toBe(GUIDE_VERSION)
    expect(state.lastActiveGame?.gameId).toBe('klondike')
    expect(state.achievements.stats.currentDayStreak).toBe(4)
    expect(state.achievements.stats.profiles[dad.id]?.currentDayStreak).toBe(2)
    expect(state.recentWins[dad.id]?.klondike).toHaveLength(1)
    expect(state.gameInProgress.klondike[dad.id]?.moves).toBe(42)
    expect(state.gameInProgress.spider[GUEST_PLAYER_ID]?.moves).toBe(9)
  })

  it('keeps the old keys in the root entry as they were, for a rollback', async () => {
    const { disk } = await launch(disk128)
    const root = slicesOf(disk['solitaire:root'])

    expect(root.activeProfile).toBe(dad.id)
    expect(root.tableColor).toEqual(root128.tableColor)
    expect(root.settings).toMatchObject({ lockOrientation: true, lockedRotation: 90 })
    expect(root.profileSelection).toEqual({ 1: dad.id, 2: null })
    // The saved games are still in their own entries, untouched.
    expect(disk['solitaire:gameInProgress.klondike']).toBe(disk128['solitaire:gameInProgress.klondike'])
  })

  it('changes nothing on the next launch', async () => {
    const first = await launch(disk128)
    const second = await launch(first.disk)

    expect(second.store.getState()).toEqual(first.store.getState())
    expect(second.disk).toEqual(first.disk)
  })

  it('reshapes only a 1.2.8 root: a pre-Redux stamp, a fresh install and an already-reshaped root pass through', () => {
    const stamp = { _persist: { version: -1, rehydrated: false } }
    expect(reshapeForShell(stamp, SEAT_COLORS)).toBe(stamp)
    expect(reshapeForShell(undefined, SEAT_COLORS)).toBeUndefined()
    const reshaped = reshapeForShell({ ...stamp, ...root128 } as never, SEAT_COLORS)
    expect(reshapeForShell(reshaped, SEAT_COLORS)).toBe(reshaped)
  })

  it('carries a guest who never picked a color, and a store from before color picks were kept', () => {
    const reshaped = reshapeForShell({ _persist: { version: -1, rehydrated: true }, activeProfile: null, profiles: [], tableColor: { guestColor: null, override: '#123456' }, settings: { ...DEFAULT_SETTINGS, lockOrientation: false } } as never, SEAT_COLORS) as unknown as Record<string, unknown>

    expect(reshaped.profileSelection).toEqual({ 1: null, 2: null })
    expect(reshaped.seatColors).toEqual({ lastGuestColor: { ...SEAT_COLORS }, lastCpuColor: SEAT_COLORS[2], profileColors: {} })
    expect(reshaped.appSettings).toEqual({ lockOrientation: false, deferBottomEdgeGestures: false })
  })
})

// Jay, 2026-10-29: the old keys stay for one release, so an OTA rolled back to 1.2.8 finds each player, color pick and
// lock as they were at the move.
describe('a rollback to 1.2.8', () => {
  it("finds the player, the color picks and the lock in what the move left behind, loaded by 1.2.8's own store", async () => {
    const moved = await launch(disk128)
    // A pick and a lock made after the move are the new keys' alone, so a rollback finds the move's.
    send(moved.store, shell.profileSelectionActions.select({ seat: 1, profileId: kid.id }))
    send(moved.store, shell.appSettingsActions.initialize({ lockOrientation: false, lockedRotation: undefined }))
    await moved.persistor.flush()

    const { store } = await launch128(moved.storage)
    const state = store.getState()

    expect(state.activeProfile).toBe(dad.id)
    expect(state.tableColor).toEqual(root128.tableColor)
    expect(state.settings).toMatchObject({ lockOrientation: true, lockedRotation: 90, klondikeDraw: expect.any(Number) })
    expect(state.profiles).toEqual([dad, kid])
    expect(state.gameInProgress.klondike[dad.id]?.moves).toBe(42)
  })

  it('reshapes again from what 1.2.8 changed, once rolled forward', async () => {
    const moved = await launch(disk128)
    const rolledBack = await launch128(moved.disk)
    rolledBack.store.dispatch(release128Actions.activeProfile.select(kid.id))
    rolledBack.store.dispatch(release128Actions.tableColor.setColor({ id: kid.id, color: '#3f51b5' }))
    await rolledBack.persistor.flush()
    // 1.2.8 drops the keys it has no reducer for on its next write.
    expect(Object.keys(slicesOf(rolledBack.storage['solitaire:root']))).not.toEqual(expect.arrayContaining(['profileSelection']))

    const { store } = await launch(rolledBack.storage)

    expect(store.getState().profileSelection[1]).toBe(kid.id)
    expect(store.getState().seatColors.profileColors[kid.id]).toEqual({ color: '#3f51b5', profileColor: kid.color })
  })
})
