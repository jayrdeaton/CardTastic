import type { PackDefinition, PackGameDefinition } from '@tastic/shell'

import { CARD_FONT_FAMILY, CARD_FONTS } from '@/components/cardFont'
import { HeroTitle } from '@/components/HeroTitle'
import { packGuide, SolitaireProvider, useFeedbackSounds, useScreenOptions } from '@/components/packRoot'
import { SettingsSections } from '@/components/SettingsSections'
import { RecordsTab, SolitaireAchievementList, SolitaireStatsSections, statsReset } from '@/components/SolitaireStats'
import { TableBackground } from '@/components/TableBackground'
import { CHROME_FG, previewCardBack } from '@/components/theme'
import { ThemedToaster } from '@/components/ThemedToaster'
import { useFrameAutoAlign } from '@/components/useFrameAutoAlign'
import { release } from '@/constants/release'
import { DEFAULT_SEED_COLOR } from '@/constants/theme'
import { acesup } from '@/games/acesup/definition'
import { canfield } from '@/games/canfield/definition'
import { fortythieves } from '@/games/fortythieves/definition'
import { freecell } from '@/games/freecell/definition'
import { golf } from '@/games/golf/definition'
import { klondike } from '@/games/klondike/definition'
import { pyramid } from '@/games/pyramid/definition'
import { ratslap } from '@/games/ratslap/definition'
import { scorpion } from '@/games/scorpion/definition'
import { sixcardgolf } from '@/games/sixcardgolf/definition'
import { slapjack } from '@/games/slapjack/definition'
import { spider } from '@/games/spider/definition'
import { trash } from '@/games/trash/definition'
import { tripeaks } from '@/games/tripeaks/definition'
import { yukon } from '@/games/yukon/definition'
import { storeSource } from '@/redux/store'

// Solitaire as a @tastic/shell pack: its root (app/_layout.tsx), Home (app/index.tsx) and every game's play screen
// (app/play/[game].tsx). The store is built from the part of this the shell needs (redux/store.ts).

// Home's order, grouped by mechanic: the build-down-to-foundations games first (Klondike, FreeCell, Yukon, Canfield and
// Forty Thieves all end with ascending same-suit foundations), then Spider and Scorpion (tableau runs, no foundations),
// then the clear-the-tableau games (Pyramid, Golf, TriPeaks discard cards outright), then Aces Up, the odd one out. The
// games for two players come last: the slap games (RatSlap, the first, then Slapjack), then the turn-by-turn ones.
export const games: readonly PackGameDefinition[] = [klondike, freecell, yukon, canfield, fortythieves, spider, scorpion, pyramid, golf, tripeaks, acesup, ratslap, slapjack, sixcardgolf, trash]

const solitaire = {
  // Seat 1's color, the theme it makes, and Solitaire's own store keys.
  ...storeSource,
  name: 'CardTastic',
  // Home's title and the line under it (HeroTitle).
  wordmark: ['CardTastic', 'No ads. No accounts. Plays offline. Just cards.'],
  // Under the Color row of seat 1's menu, while a profile plays: a pick here changes this app's color only.
  colorCaption: 'CardTastic only',
  games,
  // Home's tabs (Jay, 2026-11-04): the solitaire games, then the games for two players (the ones with a seat 2), each in
  // Home's order. Home opens on Solitaire.
  homeTabs: [
    { label: 'Solitaire', includes: (game) => !game.seatTwo },
    { label: 'Two Player', includes: (game) => !!game.seatTwo }
  ],
  HeroTitle,
  // The player button reads GUEST, its menu's row Guest.
  guestLabel: 'GUEST',
  nullLabel: 'Guest',
  // hud measures a turned button against the upright window, so held sideways it can open a menu off the screen.
  usePickerAlign: useFrameAutoAlign,
  // Gameplay and Cards, under the shell's own rows in every Settings sheet.
  SettingsSections,
  // The stats screen (app/stats.tsx, components/SolitaireStats.tsx): guest's stats are their own (a Guest entry once a
  // profile exists, and the screen opens on whoever is playing); the calendar, totals and Activity across every game first
  // on Stats; a Records tab; one achievement list across the games; Reset following the player picker. Each rule set's
  // well already names its game, so no game name over each game's part.
  guestStats: true,
  StatsSections: SolitaireStatsSections,
  statsTabs: [{ value: 'records', label: 'Records', Content: RecordsTab }],
  AchievementList: SolitaireAchievementList,
  resetStats: statsReset,
  statsGameTitles: false,
  // A new profile on Profiles starts on the seat color, as a fresh install does.
  newProfileColor: DEFAULT_SEED_COLOR,
  // The felt, drawn once behind every screen (see TableBackground), and what Home, Stats and Profiles draw on it in.
  Backdrop: TableBackground,
  foreground: CHROME_FG,
  Provider: SolitaireProvider,
  useScreenOptions,
  useFeedbackSounds,
  // Stacked from the top between the corner buttons (see ThemedToaster).
  Toaster: ThemedToaster,
  // A profile's name can be typed with the phone sideways.
  portraitWhileKeyboard: true,
  // No edge controls and no Edge Guard plugin.
  edgeGuard: false,
  // Every profile color drawn muted, as the card backs are.
  previewColor: previewCardBack,
  fonts: CARD_FONTS,
  fontFamily: CARD_FONT_FAMILY,
  otaVersion: release.otaVersion,
  guide: packGuide
} satisfies PackDefinition

export const pack: PackDefinition = solitaire
