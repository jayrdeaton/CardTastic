import AsyncStorage from '@react-native-async-storage/async-storage'
import { combineReducers, configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { createThemeReducer } from '@rific/auto-paper'
import { createSettingsSlice, keepAwakeReducer } from '@rific/core'
import { defaultSoundSettings, hapticReducer, soundReducer, type SoundSettings } from '@rific/feedback-press'
import { createReturningPlayerMigrate } from '@tastic/hud/guide'
import { profilesReducer } from '@tastic/profile'
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist'

import { DEFAULT_SEED_COLOR, THEME_HARMONY } from '@/constants/theme'
import achievements from '@/redux/achievementsSlice'
import gameInProgress from '@/redux/gameInProgressSlice'
import guide, { LEGACY_STORAGE_KEYS } from '@/redux/guideSlice'
import playerSettings from '@/redux/playerSettingsSlice'
import recentWins from '@/redux/recentWinsSlice'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import topWins from '@/redux/topWinsSlice'
import type { LegacySettingsLock, Settings } from '@/types'

// Test-only: the store Solitaire 1.2.8 (68be3d7) builds, for the rollback check in store.test.ts (an OTA rolled back
// to 1.2.8 loads what the CardTastic move left in `solitaire:root`). Its root reducer and persist config as 1.2.8's
// redux/store.ts had them. The slices the move changed or took over are copied as 1.2.8 had them (activeProfile,
// tableColor, settings with the lock among its defaults, and lastActiveGame, the shell's since step 4); every other
// slice is unchanged since 68be3d7 and imported. The player-settings middleware is left out (it only acts on a profile
// pick, never on a rehydrate). Delete this with activeProfileSlice.ts and tableColorSlice.ts, the release after the
// move. Lives outside __tests__ because jest runs every file there as a suite.

const activeProfileSlice = createSlice({
  initialState: null as string | null,
  name: 'activeProfile',
  reducers: {
    select: (_state, action: PayloadAction<string | null>) => action.payload
  }
})

interface TableColorState {
  guestColor: string | null
  profileColors?: Record<string, string>
}

const tableColorSlice = createSlice({
  initialState: { guestColor: null, profileColors: {} } as TableColorState,
  name: 'tableColor',
  reducers: {
    setColor: (state, action: PayloadAction<{ id: string | null; color: string | null }>) => {
      const { id, color } = action.payload
      if (id === null) {
        state.guestColor = color
        return
      }
      const profileColors = { ...state.profileColors }
      if (color === null) delete profileColors[id]
      else profileColors[id] = color
      state.profileColors = profileColors
    }
  }
})

type Settings128 = Settings & LegacySettingsLock
const lastActiveGame = createSettingsSlice<{ gameId: string | null }>('lastActiveGame', { initialState: { gameId: null } }).reducer

const settingsSlice = createSettingsSlice<Settings128, 'merge', never>('settings', { initialState: { ...DEFAULT_SETTINGS, lockOrientation: false }, initializeMode: 'merge', fieldSetters: [] })

const initialSoundSettings: SoundSettings = { ...defaultSoundSettings, enabled: !__DEV__ }
const appSoundReducer = (state: SoundSettings = initialSoundSettings, action: { type: string }): SoundSettings => soundReducer(state, action)

const rootReducer = combineReducers({
  theme: createThemeReducer({ color: DEFAULT_SEED_COLOR, harmony: THEME_HARMONY }),
  lastActiveGame,
  gameInProgress,
  achievements,
  recentWins,
  topWins,
  haptic: hapticReducer,
  sound: appSoundReducer,
  keepAwake: keepAwakeReducer,
  profiles: profilesReducer,
  activeProfile: activeProfileSlice.reducer,
  tableColor: tableColorSlice.reducer,
  guide,
  settings: settingsSlice.reducer,
  playerSettings
})

export const release128Actions = { activeProfile: activeProfileSlice.actions, tableColor: tableColorSlice.actions, settings: settingsSlice.actions }

/** Builds 1.2.8's store. `timeout: 0` is the one change from 1.2.8's persist config: its 5s rehydrate failsafe would
 * hold the Jest worker open, and it never fires once storage answers. */
export function createRelease128Store() {
  const store = configureStore({
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ immutableCheck: false, serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], ignoredPaths: ['gameInProgress'] } }),
    reducer: persistReducer({ key: 'root', keyPrefix: 'solitaire:', storage: AsyncStorage, timeout: 0, migrate: createReturningPlayerMigrate(AsyncStorage, LEGACY_STORAGE_KEYS), blacklist: ['gameInProgress'] }, rootReducer)
  })
  return { store, persistor: persistStore(store) }
}
