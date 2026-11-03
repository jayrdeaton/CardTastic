import { forgetProfileAchievements, onProfileRemoved } from '@tastic/shell'

import { SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'

import achievements, { dropProfileStats } from './achievementsSlice'
import activeProfile from './activeProfileSlice'
import gameInProgress, { gameInProgressActions } from './gameInProgressSlice'
import guide from './guideSlice'
import playerSettings, { playerSettingsActions } from './playerSettingsSlice'
import recentWins, { recentWinsActions } from './recentWinsSlice'
import settings from './settingsSlice'
import tableColor from './tableColorSlice'
import topWins, { topWinsActions } from './topWinsSlice'

// A saved board for a deleted profile, in every game: through the reducer, so each game's own persisted entry is
// rewritten too.
const forgetSaves = (state: ReturnType<typeof gameInProgress>, profileId: string) => SOLITAIRE_GAME_IDS.reduce((slots, id) => gameInProgress(slots, gameInProgressActions[id].setSaved({ owner: profileId, saved: null })), state)

/**
 * Solitaire's own store keys (the pack's `reducers`, redux/store.ts), beside @tastic/shell's (theme, haptic, sound,
 * keepAwake, profiles, profileSelection, seatColors, appSettings, opponent, liveplay, and lastActiveGame, which a
 * resumable game brings). Everything kept per player forgets a profile the Profiles screen deletes (onProfileRemoved, on
 * @tastic/profile's remove, which the shell's deleteProfile dispatches; the shell's seatColors drops its color pick
 * itself). A profile deleted in a sibling app leaves its data behind, as before. A player's reset (stores/playerData.ts)
 * keeps their settings and color pick.
 */
export const packReducers = {
  // Each game's resumable board, persisted under its own keys and so blacklisted from the root entry (see
  // gameInProgressSlice.ts and redux/store.ts).
  gameInProgress: onProfileRemoved(gameInProgress, forgetSaves),
  // Stats and unlocked achievements (see achievementsSlice.ts).
  achievements: onProfileRemoved(achievements, forgetProfileAchievements(dropProfileStats)),
  // Each player's latest wins in each variant, which their par is made from (see recentWinsSlice.ts).
  recentWins: onProfileRemoved(recentWins, (state, profileId) => recentWins(state, recentWinsActions.forget(profileId))),
  // Each player's best wins in each variant, by score and by time: the win card's rank and the Records tab (see
  // topWinsSlice.ts).
  topWins: onProfileRemoved(topWins, (state, profileId) => topWins(state, topWinsActions.forget(profileId))),
  // Which version of the how-to-play flow this player has finished or skipped. Its own key rather than a Settings
  // field, so it survives Reset Stats. See guideSlice.ts's own doc.
  guide,
  // The persisted settings (see settingsSlice.ts): the selected player's, for the ones that follow the player.
  settings,
  // Every other player's settings, swapped with the live ones whenever seat 1 changes (see playerSettingsSlice.ts).
  playerSettings: onProfileRemoved(playerSettings, (state, profileId) => playerSettings(state, playerSettingsActions.remove(profileId))),
  // Solitaire's player and color picks from before the move, kept for one release for a rollback to 1.2.8 (see each
  // file). Never read.
  activeProfile,
  tableColor
}

export type PackReducersState = { [K in keyof typeof packReducers]: ReturnType<(typeof packReducers)[K]> }
