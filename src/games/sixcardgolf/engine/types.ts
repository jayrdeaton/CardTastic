// Six-Card Golf's state: each player's six cards (two rows of three), the stock and the discard, and the card in hand.

import { type Card } from '@tastic/cards'

import type { PlayerIndex } from '@/games/table/players'

export type { PlayerIndex }

/** Six cards a player: index row * 3 + column, row 0 the far row. The two cards of column c are c and c + 3. */
export const GRID_COLUMNS = 3
export const GRID_SIZE = 6

/** How many cards each player turns face up before a hole's first turn. */
export const OPENING_FLIPS = 2

export type GolfPhase =
  // Each player turns two of their cards face up, in any order, at the same time.
  | 'flip'
  // `turn` draws from the stock or takes the discard.
  | 'draw'
  // `turn` holds a card: swap it into their grid, or (drawn from the stock) discard it.
  | 'place'
  // Every card is face up and scored; waiting for the next hole.
  | 'holeOver'
  | 'matchOver'

export interface GolfState {
  /** How many holes the match plays. */
  holes: number
  /** The hole in play, from 1. */
  hole: number
  /** Index 0 is player 1's. A card's own `faceUp` says whether it's turned over. */
  grids: [Card[], Card[]]
  /** Face down, top last. */
  stock: Card[]
  /** Face up, top last. */
  discard: Card[]
  phase: GolfPhase
  /** Whose turn it is to draw or place. */
  turn: PlayerIndex
  /** The opening flips each player still owes this hole (index 0 is player 1's). */
  toFlip: [number, number]
  /** The card in hand, face up, and where it came from: a card taken from the discard can't go straight back. */
  held: { card: Card; from: 'stock' | 'discard' } | null
  /** Who turned their last card face up first this hole: the other player gets one more turn, then the hole ends. */
  finisher: PlayerIndex | null
  /** Every finished hole's score (index 0 is player 1's). */
  scores: [number[], number[]]
  /** Who plays first this hole. It alternates. */
  starter: PlayerIndex
  /** The match's seed: each hole's deal and any reshuffle come from it. */
  seed: number
  /** Reshuffles of the discard into the stock this hole, so each one is its own shuffle. */
  reshuffles: number
  /** Turns played this hole. */
  turns: number
}
