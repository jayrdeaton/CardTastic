import type { ViewRotation } from '@tastic/core'

import type { GinTarget } from '@/games/ginrummy/engine/types'
import type { CpuLevel } from '@/games/table/cpuLevel'
import type { WarLength } from '@/games/war/engine/types'

// The persisted player settings (see redux/settingsSlice.ts for the defaults and hooks/useSettings.ts
// for reading and writing them).
export interface Settings {
  klondikeDraw: 1 | 3
  spiderSuits: 1 | 2 | 4
  // Canfield's stock draws either 1 or 3 cards at a time, same choice Klondike already exposes -
  // defaults to 3, matching this app's original hardcoded DRAW_COUNT so nobody's existing deal
  // shape changes until they opt in.
  canfieldDraw: 1 | 3
  // Whether a King may build onto an Ace (and vice versa) on Golf's/TriPeaks' single build pile -
  // two independent booleans, not one shared setting: they're the same underlying adjacency check,
  // but each game keeps its own classic identity and default, matching how klondikeDraw/spiderSuits
  // are each scoped to their own game rather than shared across games. Both default false (no
  // wraparound), matching today's behavior.
  golfRankWrap: boolean
  tripeaksRankWrap: boolean
  // Scorpion's stock: true deals only 49 cards into the tableau at first, holding the other 3 back
  // as a one-shot lifeline the player deals in later (see games/scorpion/rules.ts); false is the
  // strict classic layout with no stock at all, dealing all 52 up front. Defaults true - the
  // gentler, more commonly shipped version.
  scorpionAssistedStock: boolean
  // Forty Thieves' tableau moves: false (default) is the strict classic rule, one card at a time
  // only; true allows a valid same-suit descending run to move together as a shortcut.
  fortyThievesRunMoves: boolean
  // RatSlap's rules, each switchable on its setup screen before a match (all on by default): slaps
  // on doubles, slaps on sandwiches, and the two jokers (Jay's house rule: a joker cancels a face-card
  // challenge). A match runs on the rules it was dealt with (games/ratslap/engine/types.ts).
  ratslapDoubles: boolean
  ratslapSandwiches: boolean
  ratslapJokers: boolean
  // How quick the CPU in RatSlap's seat 2 is (games/ratslap/engine/cpu.ts).
  ratslapCpu: CpuLevel
  // Slapjack's CPU (the slap games share one engine and one CPU, games/ratslap/engine/cpu.ts).
  slapjackCpu: CpuLevel
  // Six-Card Golf: how many holes a match plays, and how well its CPU plays (games/sixcardgolf/engine/cpu.ts).
  sixCardGolfHoles: SixCardGolfHoles
  sixCardGolfCpu: CpuLevel
  // Trash: how many cards each player starts a match with (10 is the full game, Ace to 10; 5 a short one, Ace to 5), and
  // how well its CPU plays (games/trash/engine/cpu.ts).
  trashCards: TrashCards
  trashCpu: CpuLevel
  // War: how a match ends, Full (until someone has every card) or Short (most cards after 26 battles; games/war). Its CPU
  // has no levels.
  warLength: WarLength
  // How quick the CPU in Speed's seat 2 is (games/speed/engine/cpu.ts).
  speedCpu: CpuLevel
  // Gin Rummy: the score a match plays to (100, or 50 for a shorter game), and how well its CPU plays
  // (games/ginrummy/engine/cpu.ts).
  ginTarget: GinTarget
  ginCpu: CpuLevel
  // Global, not per-game (unlike every setting above): whether auto-play runs at all - the safe cards
  // that follow the player's own play of a card to a foundation (useAutoFoundationCascade), and the
  // finish that files a solved board away on its own (useAutoFinish; see engine/autoFoundation.ts). Applies
  // identically across every foundation-building game (Klondike/FreeCell/Yukon/Canfield/Forty
  // Thieves) as one play-style preference, not a rule variant any single game owns. Defaults true,
  // matching today's always-on behavior.
  autoMoveToFoundation: boolean
  // Global, not per-game (same reasoning as autoMoveToFoundation above): whether a face-up tableau
  // card that isn't currently the head of a legal, draggable run is shown dimmed (see PileView's
  // own dimUnplayable prop). Only FreeCell/Canfield/Golf/Spider ever have anything to dim - a card
  // that's face-up but not a legal move source, because those games' initial deals/move rules don't
  // guarantee every face-up run stays internally valid (see each screen's own dimUnplayable comment
  // on its PileView call). Klondike's and Yukon's own tableau-building rules make this a permanent
  // no-op for them, so the setting has nothing to affect there either way. Defaults true, matching
  // today's always-on behavior - a hint you can turn off for a harder, spot-it-yourself mode.
  dimUnplayable: boolean
  // Global, not per-game: after how many seconds with no move the Hint shows by itself (GameChrome's
  // useAutoHint), or 0 for never. An auto hint counts exactly like a pressed one (Hints Used, and the
  // win no longer counts toward Wins Without Hint). Defaults 0, so nothing changes until it's turned on.
  autoHintSeconds: AutoHintSeconds
  // 'decorated' renders the full-colour illustrated deck instead of the compact corner-index +
  // big-pip layout. 'tarot' is a peer option, not a sub-mode of 'compact': the same corner-index +
  // big-pip layout, but with cups/coins/wands/swords in place of hearts/diamonds/clubs/spades -
  // hearts/diamonds/clubs/spades' historical tarot counterparts. 'numeric' is another peer option:
  // identical to 'compact' except non-court ranks show a big rank numeral instead of a big suit
  // pip (court cards keep their illustrated figure either way) - easier to read at a glance in a
  // same-suit run (e.g. Spider), where every big pip otherwise looks alike.
  cardStyle: 'compact' | 'decorated' | 'tarot' | 'numeric'
  // 'geometric' is CardBack.tsx's own original design; 'monogram' is the same back with the selected
  // player's tag in the middle, or S until they have one (components/CardBackArt.tsx); 'ornate'/'plain'
  // are SVG-cards-derived (see artwork/NOTICE.md), rendered via DecoratedCardBack. Independent of
  // cardStyle above - a face style choice, not a back style choice.
  cardBackStyle: 'monogram' | 'geometric' | 'ornate' | 'plain'
  // Dark mode only: flips black suit ink (spades/clubs) to white and the card face to near-black.
  // Red suits are never touched. A no-op in light mode (see theme.ts's textBlackInverted/
  // cardFaceInverted/dimOverlayInverted, which mirror their normal counterparts on lightColors) -
  // safe to leave on regardless of current appearance. Defaults false: today's dark mode (same
  // red/black ink as light mode) stays the default look; this is an opt-in alternative, not a
  // replacement.
  invertDarkModeColors: boolean
  // Lock Orientation and its angle aren't here any more: they're @tastic/shell's `appSettings` (since the
  // CardTastic move, 2026-10-29), still following the player (redux/playerSettingsSlice.ts). A store saved
  // before keeps them in `settings` for one release (LegacySettingsLock), for a rollback to 1.2.8.
  // The Settings row's own Reduce Motion. Applied together with the device's setting (either one turns it on), see
  // components/reducedMotion.tsx for what it does. Defaults false.
  reduceMotion: boolean
}

/** Lock Orientation as Settings held it until the CardTastic move (2026-10-29): what a store saved by 1.2.8 has in
 * `settings`, kept there untouched for one release so an OTA rolled back to 1.2.8 finds the lock (redux/shellMigrate.ts
 * copies it into the shell's `appSettings`), and what a player's filed settings carry (redux/playerSettingsSlice.ts). */
export interface LegacySettingsLock {
  lockOrientation?: boolean
  lockedRotation?: ViewRotation
}

/** The Auto Hint setting's choices, in the order its Settings row cycles through them. */
export const AUTO_HINT_CHOICES = [0, 15, 30] as const
export type AutoHintSeconds = (typeof AUTO_HINT_CHOICES)[number]

/** Six-Card Golf's match lengths, in the order its setup screen shows them. */
export const SIX_CARD_GOLF_HOLES = [1, 3, 9] as const
export type SixCardGolfHoles = (typeof SIX_CARD_GOLF_HOLES)[number]

/** Trash's starting hands: the full game (Ace to 10) and a short one (Ace to 5). */
export const TRASH_CARDS = [10, 5] as const
export type TrashCards = (typeof TRASH_CARDS)[number]
