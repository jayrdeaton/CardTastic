// War's state: two decks, the cards each player has put into the battle in play, and how many battles have been won.

import { type Card } from '@tastic/cards'

import type { PlayerIndex } from '@/games/table/players'

export type { PlayerIndex }

/** How a match ends: when one player has every card, or after SHORT_GAME_BATTLES battles, most cards winning. */
export type WarLength = 'full' | 'short'

/** A short game's battles. Half a deck's worth. */
export const SHORT_GAME_BATTLES = 26

/** In a war, each player puts this many cards face down before the one face up: three (Jay, 2026-11-05), or one for a
 * quicker war (the setup screen's choice). */
export type WarDown = 1 | 3
export const WAR_DOWNS: readonly WarDown[] = [3, 1]

/** A card in a battle, as it lies: the face-up battle cards, and a war's face-down ones. */
export interface BattleCard {
  card: Card
  faceUp: boolean
}

export interface WarState {
  length: WarLength
  /** How many cards go face down in a war. */
  down: WarDown
  /** Index 0 is player 1's. The top of a deck is the END of its array; index 0 is its bottom card. */
  hands: [Card[], Card[]]
  /** The cards each player has put into the battle in play, in the order they went down. */
  battle: [BattleCard[], BattleCard[]]
  /** Whether each player has played their part of the step in play: a card, or a war's cards. */
  played: [boolean, boolean]
  /** Whether the step in play is a war (a tie to settle). */
  war: boolean
  /** Who won the battle in play; it waits to be collected (collectBattle) and nothing is played meanwhile. */
  battleWinner: PlayerIndex | null
  /** Battles won so far (a war is part of its battle). */
  battles: number
  /** Wars fought so far, each tie that started one. */
  wars: number
  /** The match's winner, or 'tie' for a short game that ends level. */
  winner: PlayerIndex | 'tie' | null
  /** The match's seed: the deal and each won battle's shuffle come from it. */
  seed: number
}
