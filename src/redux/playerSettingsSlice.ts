import type { Action, Dispatch, Middleware } from '@reduxjs/toolkit'
import { themeActions, type ThemeSettings } from '@rific/auto-paper'
import { keepAwakeActions, type KeepAwakeSettings } from '@rific/core'
import { hapticActions, type HapticSettings, soundActions, type SoundSettings } from '@rific/feedback-press'
import { createProfileExtensionSlice, type Profile, type ProfileExtensionState } from '@tastic/profile'
import type { ProfileSelectionState } from '@tastic/shell'
import { REHYDRATE } from 'redux-persist'

import { GUEST_PLAYER_ID } from '@/constants/player'
import type { Settings } from '@/types'

import { settingsActions } from './settingsSlice'

// Every setting follows the player (2026-10-15, Jay: his kids want sounds and hints, he doesn't, and
// any line between "the player's" and "the phone's" would be invisible to the people using it). That is
// the whole Settings sheet: the `settings` slice (rules, play aids, card looks, Reduce Motion), `sound`,
// `haptic`, `keepAwake` (@rific/core's Keep Awake), and the theme's appearance and Blur. The theme's color
// is already the player's (ProfileThemeSync). Sound can follow the player safely: the iPhone's ring/silent
// switch still mutes every game sound (@rific/feedback-press plays them as ambient audio).
//
// The live slices always hold the SELECTED player's values, so nothing that reads them changes (each
// provider bridged from them - FeedbackPressProvider, auto-paper's, Keep Awake - adopts a
// changed value, see @rific/core's createSettingsContext). This slice keeps everyone else's:
// playerSettingsMiddleware files the outgoing player's live values here and loads the incoming player's
// whenever seat 1 changes. A player with nothing filed (new, from a sibling app, or anyone before
// this existed) starts with the settings on screen, so picking them changes nothing. Within Solitaire
// only: these settings don't exist in the other games.
export interface PlayerSettings {
  settings: Settings
  sound: SoundSettings
  haptic: HapticSettings
  keepAwake: KeepAwakeSettings
  theme: Pick<ThemeSettings, 'appearance' | 'blur'>
}

const slice = createProfileExtensionSlice<PlayerSettings>('playerSettings')
export const playerSettingsActions = slice.actions
export default slice.reducer

/** The slices this middleware reads; a subset of RootState, so a test can build a small store. */
export interface PlayerSettingsState {
  profileSelection: ProfileSelectionState
  profiles: Profile[]
  settings: Settings
  sound: SoundSettings
  haptic: HapticSettings
  keepAwake: KeepAwakeSettings
  theme: Pick<ThemeSettings, 'appearance' | 'blur'>
  playerSettings: ProfileExtensionState<PlayerSettings>
}

const seatOnePlayer = (state: PlayerSettingsState) => state.profileSelection[1] ?? GUEST_PLAYER_ID

function livePlayerSettings(state: PlayerSettingsState): PlayerSettings {
  return { settings: state.settings, sound: state.sound, haptic: state.haptic, keepAwake: state.keepAwake, theme: { appearance: state.theme.appearance, blur: state.theme.blur } }
}

const isRehydrate = (action: unknown) => typeof action === 'object' && action !== null && (action as { type?: unknown }).type === REHYDRATE

/**
 * Whenever seat 1 changes hands (a pick at Home; a deletion, which the shell's ProfilesProvider follows
 * with clearProfile; a profile a sibling app deleted, which pruneToRoster drops): files the live values
 * under the player leaving (unless they are no longer on the roster, i.e. just deleted), then loads the
 * arriving player's, laid over the live values so a setting added after they were filed keeps what is on
 * screen. Nothing filed: nothing changes. Seat 1 is compared before and after every action rather than
 * matched on one action type, since three different actions move it. A rehydrate isn't a change of
 * player: it puts back whoever was playing.
 */
// Dispatch<Action>: @tastic/profile's action creators type their actions without RTK's index signature.
export const playerSettingsMiddleware: Middleware<object, PlayerSettingsState, Dispatch<Action>> = (api) => (next) => (action) => {
  if (isRehydrate(action)) return next(action)

  const before = api.getState()
  const from = seatOnePlayer(before)
  const result = next(action)
  const to = seatOnePlayer(api.getState())
  if (from === to) return result

  if (from === GUEST_PLAYER_ID || before.profiles.some((p) => p.id === from)) api.dispatch(playerSettingsActions.set({ id: from, extension: livePlayerSettings(before) }))
  const after = api.getState()
  const stored = after.playerSettings[to]
  if (!stored) return result
  api.dispatch(settingsActions.initialize(stored.settings))
  api.dispatch(soundActions.initialize({ ...after.sound, ...stored.sound }))
  api.dispatch(hapticActions.initialize({ ...after.haptic, ...stored.haptic }))
  api.dispatch(keepAwakeActions.initialize({ ...after.keepAwake, ...stored.keepAwake }))
  api.dispatch(themeActions.initialize(stored.theme))
  return result
}
