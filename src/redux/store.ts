import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EnhancedStore, Middleware, Reducer } from '@reduxjs/toolkit'
import { createReturningPlayerMigrate } from '@tastic/hud/guide'
import { createPackStore, type PackStoreConfig, type PackStoreSource, type Seat, type ShellState } from '@tastic/shell'

import { playerTheme } from '@/components/theme'
import { SEAT_COLORS } from '@/constants/player'
import { fourCrownsGuide } from '@/games/fourcrowns/guide'
import { ginRummyGuide } from '@/games/ginrummy/guide'
import { ratslapGuide } from '@/games/ratslap/guide'
import { sixCardGolfGuide } from '@/games/sixcardgolf/guide'
import { slapjackGuide } from '@/games/slapjack/guide'
import { speedGuide } from '@/games/speed/guide'
import { trashGuide } from '@/games/trash/guide'
import { warGuide } from '@/games/war/guide'
import { LEGACY_STORAGE_KEYS } from '@/redux/guideSlice'
import { packReducers, type PackReducersState } from '@/redux/packReducers'
import { playerSettingsMiddleware } from '@/redux/playerSettingsSlice'
import { createShellMigrate } from '@/redux/shellMigrate'
import { SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'

// The store, built by @tastic/shell from the part of the pack it needs. It lives here rather than in pack.ts because the
// pack holds every game's screen, and the screens reach the store (stores/gameInProgress.ts): built in pack.ts it would
// be an import cycle. Everything imports the store through this module, and screen tests swap it for
// testUtils/gameInProgressStore.ts.

// The table games' part (each definition, games/<id>/definition.ts, holds its screen, which can't be imported here):
// each How to Play's seen version. Their results are among Solitaire's own keys (redux/matchStatsSlice.ts), so a
// player's reset and Reset Stats reach them. Their matches aren't saved.
const TABLE_GAME_STORES: { id: string; reducers: Record<string, Reducer>; resumable: boolean }[] = [
  { id: 'ratslap', reducers: { ratslapGuide: ratslapGuide.reducer }, resumable: false },
  { id: 'slapjack', reducers: { slapjackGuide: slapjackGuide.reducer }, resumable: false },
  { id: 'speed', reducers: { speedGuide: speedGuide.reducer }, resumable: false },
  { id: 'war', reducers: { warGuide: warGuide.reducer }, resumable: false },
  { id: 'sixcardgolf', reducers: { sixCardGolfGuide: sixCardGolfGuide.reducer }, resumable: false },
  { id: 'trash', reducers: { trashGuide: trashGuide.reducer }, resumable: false },
  { id: 'ginrummy', reducers: { ginRummyGuide: ginRummyGuide.reducer }, resumable: false },
  { id: 'fourcrowns', reducers: { fourCrownsGuide: fourCrownsGuide.reducer }, resumable: false }
]

export const storeSource = {
  seatColors: SEAT_COLORS,
  // A fresh install starts on the theme seat 1's color makes, the one ProfileThemeSync keeps it on.
  seatTheme: (colors: Record<Seat, string>, dark: boolean) => playerTheme(colors[1], dark),
  // Solitaire's own keys (redux/packReducers.ts).
  reducers: packReducers,
  // Every solitaire game resumes (its play screen saves its own board), so the shell mounts its `lastActiveGame` key: the
  // same key, shape and action types Solitaire's own had, so a saved resume carries over.
  games: [...SOLITAIRE_GAME_IDS.map((id) => ({ id, reducers: {}, resumable: true })), ...TABLE_GAME_STORES]
} satisfies PackStoreSource

export const storeConfig: PackStoreConfig = {
  // On web every Tastic game shares one origin (games.infinitetoken.com) and so one localStorage, so the root entry is
  // `solitaire:root`. Never change it: every player would start over.
  keyPrefix: 'solitaire:',
  // Grandfathers players from the shipped pre-redux builds (last one 25532f0, otaVersion 3) past the guide: they have no
  // root store yet, only that build's own keys, which would otherwise look like a fresh install. A no-op once a root
  // store exists. See LEGACY_STORAGE_KEYS in guideSlice.ts. Then reshapes a 1.2.8 root for the shell (shellMigrate.ts).
  migrate: createShellMigrate(createReturningPlayerMigrate(AsyncStorage, LEGACY_STORAGE_KEYS), SEAT_COLORS),
  // Persisted per game under its own keys instead (see gameInProgressSlice.ts).
  blacklist: ['gameInProgress'],
  // Saved boards are plain data but can run to megabytes; walking them on every action in dev would stall the app for
  // nothing.
  serializableIgnoredPaths: ['gameInProgress'],
  // Every setting follows the player (see playerSettingsSlice.ts).
  middleware: [playerSettingsMiddleware as Middleware]
}

export type RootState = ShellState & PackReducersState

const created = createPackStore(storeSource, storeConfig)
// The store as the shell's RootLayout takes it (app/_layout.tsx).
export const packStore = created.store
// createPackStore types its state from the shell's own keys (a pack's and its games' reducers come in as plain
// records), so this store's getState is given Solitaire's keys too.
export const store = created.store as unknown as EnhancedStore<RootState>
export const persistor = created.persistor
export type AppDispatch = typeof store.dispatch
