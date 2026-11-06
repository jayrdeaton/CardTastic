// Gin Rummy's state: both hands, the stock and the discard, whose turn it is and what they're doing, the last hand's
// result, and the match's score.

import { type Card } from '@tastic/cards'

import type { PlayerIndex } from '@/games/table/players'

import type { Arrangement, DefenderArrangement } from './melds'

export type { PlayerIndex }

/** Cards dealt to each player. */
export const HAND_SIZE = 10
/** A player may knock once their deadwood, after their throw, is this or less. */
export const KNOCK_LIMIT = 10
/** Going gin scores this on top of the other player's deadwood. */
export const GIN_BONUS = 25
/** A defender whose deadwood is at or under the knocker's scores this on top of the difference. */
export const UNDERCUT_BONUS = 25
/** A hand is a draw once the stock is down to this many cards and the player who drew last throws without knocking. */
export const STOCK_LEFT_FOR_WASH = 2

/** The scores a match plays to, in the order its setup screen shows them: the full game and a short one. */
export const GIN_TARGETS = [100, 50] as const
export type GinTarget = (typeof GIN_TARGETS)[number]

export type GinPhase =
  // The first upcard is offered: the non-dealer may take it, or pass, and then the dealer may.
  | 'upcard'
  // `turn` draws from the stock, or takes the discard.
  | 'draw'
  // `turn` holds eleven cards and throws one, or knocks.
  | 'discard'
  | 'handOver'
  | 'matchOver'

/** What a player did on their last turn, as the other player could have seen it: where they drew from (the card, if it
 * was the discard), and what they threw. */
export interface GinTurn {
  player: PlayerIndex
  took: 'stock' | 'discard' | 'pass'
  /** The card taken from the discard, or the upcard passed on. */
  card: Card | null
  threw: Card | null
}

/** How a hand ended: a knock, gin, an undercut, or a draw when the stock ran down. */
export type GinEnding = 'gin' | 'knock' | 'undercut' | 'wash'

export interface GinHandResult {
  ending: GinEnding
  /** Who knocked (or went gin); null for a draw. */
  knocker: PlayerIndex | null
  /** Who scores the hand; null for a draw. */
  scorer: PlayerIndex | null
  points: number
  /** Each player's hand laid down (index 0 is player 1's). The knocker's has no cards laid off; the defender's has the
   * cards they laid off on the knocker's melds. Null for a draw, when nobody lays down. */
  shown: [DefenderArrangement, DefenderArrangement] | null
}

export interface GinState {
  /** The score that wins the match. */
  target: GinTarget
  /** Each player's cards (index 0 is player 1's), in no order: the table arranges them. */
  hands: [Card[], Card[]]
  /** Face down, top last. */
  stock: Card[]
  /** Face up, top last. */
  discard: Card[]
  phase: GinPhase
  turn: PlayerIndex
  dealer: PlayerIndex
  /** During the upcard phase: whether the non-dealer has passed on it. */
  upcardPassed: boolean
  /** True for the non-dealer's draw after both passed on the upcard: it has to come from the stock. */
  stockOnly: boolean
  /** Where the player throwing drew from this turn, and the card if it was the discard (it can't be thrown back). */
  drawnFrom: 'stock' | 'discard' | null
  taken: Card | null
  /** The cards each player has taken from the discard this hand, which both players saw. */
  pickups: [Card[], Card[]]
  lastTurn: GinTurn | null
  /** The hand just ended, while its result shows. */
  result: GinHandResult | null
  scores: [number, number]
  /** Hands won, gins and undercuts in the match, for the stats. */
  handsWon: [number, number]
  gins: [number, number]
  undercuts: [number, number]
  winner: PlayerIndex | null
  /** The hand in play, from 1. */
  hand: number
  /** The match's seed: each hand's deal comes from it. */
  seed: number
}

export type { Arrangement }
