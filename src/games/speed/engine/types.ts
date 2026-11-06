// Speed's state: each player's hand of five and draw pile, the two side piles, and the two center piles everyone plays
// on at once. There are no turns.

import { type Card } from '@tastic/cards'

import type { PlayerIndex } from '@/games/table/players'

export type { PlayerIndex }

/** Cards in a full hand. A hand refills from its draw pile after every play (or, drawing by hand, one card a tap). */
export const HAND_SIZE = 5

/** How a hand refills (the setup screen's choice, Jay, 2026-11-05 picked by itself): from its draw pile by itself after
 * every play, or a card a tap on the draw pile, up to five. */
export type SpeedRefill = 'auto' | 'tap'

export interface SpeedRules {
  /** Ranks wrap: a King goes on an Ace, an Ace on a King or a 2 (Jay's pick). Off, Ace is low only. */
  wrap: boolean
  refill: SpeedRefill
}

export const DEFAULT_SPEED_RULES: SpeedRules = { wrap: true, refill: 'auto' }
/** Each player's draw pile at the deal. */
export const DRAW_SIZE = 15
/** Each side pile at the deal: turned onto the center piles whenever nobody can play. */
export const SIDE_SIZE = 5

export interface SpeedState {
  /** Whether ranks wrap, and how a hand refills. */
  rules: SpeedRules
  /** Index 0 is player 1's. HAND_SIZE slots each; a slot is empty once its draw pile has run out. */
  hands: [(Card | null)[], (Card | null)[]]
  /** Face down, top last. */
  draws: [Card[], Card[]]
  /** The two side piles, face down, top last: the first is turned onto the first center pile, the second onto the
   * second. */
  sides: [Card[], Card[]]
  /** The two center piles, face up, top last. */
  centers: [Card[], Card[]]
  /** The match's winner, the first to play every card; with nothing left anyone can play, the one with fewer cards
   * left, or 'tie' when both hold as many. */
  winner: PlayerIndex | 'tie' | null
  /** The match's seed: the deal and each refill of the side piles come from it. */
  seed: number
  /** Times the center piles were shuffled back into the side piles. */
  refills: number
  /** Side cards turned since anyone last played. Past DEADLOCK_TURNS nobody ever will, and the match ends. */
  turnsWithoutPlay: number
}

/** Side cards turned with nobody able to play any of them: every card left has gone round twice, so nobody can. */
export const DEADLOCK_TURNS = 52
