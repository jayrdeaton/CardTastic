import { useAutoPaperTheme, useThemeSettings } from '@rific/auto-paper'
import { useOnlinePlayersSync } from '@tastic/profile/online'
import { type FeedbackSounds, type PackGuide, type StackScreenOptions, useProfiles } from '@tastic/shell'
import { type ReactNode, useEffect } from 'react'

import { CardBackWarmup } from '@/components/CardBackWarmup'
import { ReducedMotionBridge, useMotionReduced } from '@/components/reducedMotion'
import { playerTheme } from '@/components/theme'
import { useCardSoundPlayers } from '@/components/useCardSounds'
import { GUIDE_VERSION } from '@/constants/guide'
import { getGuideSteps } from '@/constants/guideSteps'
import { guideActions, selectGuideVersionSeen } from '@/redux/guideSlice'
import type { RootState } from '@/redux/store'
import { followOnlinePlayers } from '@/stores/daily'
import { GameStatsProvider } from '@/stores/gameStats'
import { online } from '@/stores/online'
import { usePlayer } from '@/stores/profiles'

// The pack's root pieces (pack.ts): what @tastic/shell's RootLayout mounts and calls for Solitaire.

/** Keeps auto-paper's own theme (colors.primary/secondary/tertiary, used by every Paper-flavored
 * dialog/button app-wide - see GameChrome's ConfirmDialog) seeded from the active profile/guest's
 * color, instead of the two silently drifting apart. Without this, auto-paper's seed is whatever
 * the store's `theme` slice last persisted (or the pack's seatTheme, on a first launch)
 * and never changes again, regardless of which profile is active or what color they've picked -
 * confirmed live: the card back/felt track the active profile correctly, but every Paper dialog
 * stayed on one fixed color forever.
 *
 * Seeds with previewCardBack's own blended result (playerTheme), not the player's raw color - a
 * profile's color is a vivid, fully-saturated swatch (see profiles.tsx's own color picker), and
 * feeding that straight into auto-paper computes an equally vivid MD3 palette, confirmed live:
 * technically tracking the profile, but reading as neon against this app's own consistently muted
 * felt/card palette (theme.ts's own PROFILE_TINT_ALPHA blend exists for exactly this - "low enough
 * to read as muted, not as the profile's own vivid swatch"). previewCardBack already mutes the profile
 * color the same way every card-table render does (its own hue, less saturated), so re-running it here (rather
 * than invent a second, differently-muted formula) keeps the chrome and the table reading as one
 * palette instead of two similarly-muted-but-not-quite-matching ones.
 *
 * Also sets THEME_HARMONY every time: a theme saved before it changed keeps the old harmony.
 *
 * The shell's Home does the same (useSeatColors, through the pack's `seatTheme`, the same playerTheme), but only while
 * Home is mounted: a cold launch that resumes a deal replaces Home with the game, so a dark-mode change (or a player's
 * own Appearance, which follows them) while in it would leave every dialog on the other mode's seed. This one sits at the
 * root, so it always applies. The two write the same theme, so neither undoes the other. It renders nothing, inside the
 * shell's Theme and ProfilesProvider, and reads the same color useTableColors() does (usePlayer), so the chrome and the
 * table never diverge, a guest who never picked one included. */
function ProfileThemeSync() {
  const { color } = usePlayer()
  const { dark } = useAutoPaperTheme()
  const { set } = useThemeSettings()
  useEffect(() => {
    set(playerTheme(color, dark))
  }, [color, dark, set])
  return null
}

/** Each profile's Daily Deal player (stores/online.ts) follows the roster: a profile deleted here or in a sibling game takes
 * its player off the server, a deletion the server can't take now being tried again at the next change or launch. The Daily
 * state of a profile whose player is gone goes with it (followOnlinePlayers). */
function OnlinePlayersSync() {
  const { profiles, loaded } = useProfiles()
  useOnlinePlayersSync(online, profiles, loaded)
  useEffect(followOnlinePlayers, [])
  return null
}

/** Solitaire's own root (the pack's `Provider`), inside the shell's store, Theme and ProfilesProvider, around How to
 * Play and the stack: one stats and achievements context across all eleven games, Reduce Motion applied app-wide, the
 * theme sync above and the profiles' online players. */
export function SolitaireProvider({ children }: { children: ReactNode }) {
  return (
    <GameStatsProvider>
      <ProfileThemeSync />
      <ReducedMotionBridge />
      <OnlinePlayersSync />
      <CardBackWarmup />
      {children}
    </GameStatsProvider>
  )
}

const LIGHT_STATUS_BAR: StackScreenOptions = { statusBarStyle: 'light' }
const LIGHT_STATUS_BAR_FADE: StackScreenOptions = { statusBarStyle: 'light', animation: 'fade' }

/** Merged into the stack's screen options after the shell's own. The status bar is always light: every screen sits on
 * the dark felt in every appearance mode (the shell's follows the app's theme, so a light theme would give dark text).
 * It's set through screen options because an app linked against the iOS 27 SDK can't set it app-wide (CLAUDE.md, "The
 * status bar is set by the root Stack's screen options"). Under Reduce Motion (see reducedMotion.tsx) iOS crossfades
 * too, instead of sliding the new screen in. Without it the animation is left out, not set: the shell crossfades on
 * Android over a backdrop, and a later key would undo that. */
export function useScreenOptions(): StackScreenOptions {
  return useMotionReduced() ? LIGHT_STATUS_BAR_FADE : LIGHT_STATUS_BAR
}

/** Every button's press plays the card sound, and a refused or notifying press the invalid-move sound, in place of the
 * shell's two wavs. The pools are built here, once (useCardSoundPlayers' own doc). */
export function useFeedbackSounds(): FeedbackSounds {
  const { playCardSound, playInvalidSound } = useCardSoundPlayers()
  return { selection: playCardSound, notification: playInvalidSound }
}

/** The three How to Play cards (constants/guideSteps.tsx) teach the whole suite, so they're the pack's, never a game's:
 * shown on Home's first launch (Home's useAutoShowGuide, held back while a cold launch resumes a deal) and from Home's
 * Settings. The seen version stays Solitaire's own `guide` key. */
export const packGuide: PackGuide = {
  version: GUIDE_VERSION,
  selectVersionSeen: (state) => selectGuideVersionSeen(state as unknown as RootState),
  markSeen: guideActions.markSeen,
  getSteps: getGuideSteps
}
