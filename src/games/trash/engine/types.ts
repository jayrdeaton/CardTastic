// Trash's state: each player's spots (Ace up to 10, fewer as they win rounds), the stock and the discard, and the card
// in hand.

import { type Card } from '@tastic/cards'

import type { PlayerIndex } from '@/games/table/players'

export type { PlayerIndex }

/** The most spots a player can have: Ace to 10. */
export const MAX_SPOTS = 10
/** Spots per row on the table: Ace to 5 over 6 to 10. */
export const SPOTS_PER_ROW = 5

/** Which rank is wild (the setup screen's choice, Jay, 2026-11-04 picked Jacks): a wild goes in any face-down spot, and
 * the other two court cards end the turn. */
export type TrashWild = 'jacks' | 'kings'
export const TRASH_WILDS: readonly TrashWild[] = ['jacks', 'kings']

export type TrashPhase =
  // `turn` draws from the stock or takes the discard.
  | 'draw'
  // `turn` holds a card: it goes in its spot, or (a wild) any face-down spot, and the card under it comes up into
  // their hand; a card with no spot is discarded and the turn passes.
  | 'place'
  | 'roundOver'
  | 'matchOver'

export interface TrashState {
  /** Which rank is wild this match. */
  wild: TrashWild
  /** How many spots each player has this round (index 0 is player 1's): spot i wants rank i + 1. */
  sizes: [number, number]
  /** Each player's spots. A card's own `faceUp` says whether the spot is filled: a face-up card there is its own rank,
   * or a wild standing in for it. */
  layouts: [Card[], Card[]]
  /** Face down, top last. */
  stock: Card[]
  /** Face up, top last. */
  discard: Card[]
  phase: TrashPhase
  turn: PlayerIndex
  /** The card in hand, face up. */
  held: Card | null
  /** Where the card in hand came from: a card taken from the discard has to be one with a spot. */
  heldFrom: 'stock' | 'discard' | 'layout' | null
  /** The round's winner, once someone has filled every spot. */
  roundWinner: PlayerIndex | null
  /** The match's winner: the first to fill a round with a single spot. */
  winner: PlayerIndex | null
  /** The round in play, from 1. */
  round: number
  /** The match's seed: each round's deal and any reshuffle come from it. */
  seed: number
  /** Reshuffles of the discard into the stock this round, so each one is its own shuffle. */
  reshuffles: number
}
