// RatSlap's state, and Slapjack's (the same table under other rules): two hands, the center pile, and any face-card
// challenge in progress.

import { type AnyCard } from '@tastic/cards'

export type PlayerIndex = 1 | 2

/** The rules a match is dealt with. RatSlap's first three are each switchable before a match (all on by default); the
 * last two tell RatSlap from Slapjack. */
export interface RatSlapRules {
  /** A slap wins the pile when the top two cards match (two 7s, or two jokers). */
  doubles: boolean
  /** A slap wins the pile when the top card matches the one two below it (7, 4, 7). */
  sandwiches: boolean
  /** Two jokers in the deck. A joker cancels a face-card challenge, however many tries are used. */
  jokers: boolean
  /** A J, Q, K or A opens a challenge (RatSlap). Off, every card just passes the turn (Slapjack). */
  faceCards: boolean
  /** A slap wins the pile when a Jack is on top (Slapjack). */
  jacks: boolean
}

export const DEFAULT_RULES: RatSlapRules = { doubles: true, sandwiches: true, jokers: true, faceCards: true, jacks: false }

/** Slapjack: slap every Jack, and nothing else. No challenges, no jokers. */
export const SLAPJACK_RULESET: RatSlapRules = { doubles: false, sandwiches: false, jokers: false, faceCards: false, jacks: true }

/** An open challenge: `attacker` played a J, Q, K or A, and `defender` has `requiredChances` tries
 * (1, 2, 3 or 4) to play one of their own, or the attacker wins the pile. */
export interface Challenge {
  triggerCard: AnyCard
  requiredChances: number
  chancesUsed: number
  attacker: PlayerIndex
  defender: PlayerIndex
}

export interface RatSlapState {
  rules: RatSlapRules
  /** Index 0 is player 1. The top of a hand is the END of its array; index 0 is its bottom card. */
  hands: [AnyCard[], AnyCard[]]
  /** Played cards, face up, bottom to top: the last one is the top card. */
  pile: AnyCard[]
  /** Cards burned by wrong slaps, face up under the pile, bottom first (each new one goes under the
   * rest). They go to whoever wins the pile, and never count toward a double or a sandwich. */
  burned: AnyCard[]
  /** Who plays next while no challenge is open (a challenge's defender plays during one). */
  turn: PlayerIndex
  challenge: Challenge | null
  /** Who played the pile's top card, or null for an empty pile. */
  lastPlayer: PlayerIndex | null
  /** Set once the pile is won; it waits there until collected (collectPile), and nothing can be
   * played meanwhile. */
  pileWinner: PlayerIndex | null
  /** A pile won by a slap is settled. One won by a face card can still be slapped away while it
   * waits to be collected, if a double or a sandwich is showing. */
  pileWonBySlap: boolean
  /** The match's winner, once there is one. */
  winner: PlayerIndex | null
}

export type SlapPattern = 'double' | 'sandwich' | 'jack'
