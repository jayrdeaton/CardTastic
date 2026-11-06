// Crazy Eights' state: every hand, the stock and the discard, the suit to follow, whose turn it is and which way play
// goes, every turn so far (for the pass cover and the other players' lines), and who won.

import { type Card, type Suit } from '@tastic/cards'

/** Two to four players, 0 to 3 in seat order (0 is seat 1). */
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

/** What a player does when no card fits (the setup screen's choice, Jay, 2026-11-06): draw until one fits, draw one, or
 * draw up to three. Once a drawn card fits it's played; if none does, the turn passes. */
export type EightsDrawRule = 'untilPlayable' | 'one' | 'three'
export const EIGHTS_DRAW_RULES: readonly EightsDrawRule[] = ['untilPlayable', 'one', 'three']

/** Which cards do something besides the wild 8s: none, 2s (the next player draws two and loses their turn), or 2s, Queens
 * (the next player is skipped) and Aces (play goes the other way). */
export type EightsSpecials = 'eights' | 'twos' | 'action'
export const EIGHTS_SPECIALS: readonly EightsSpecials[] = ['eights', 'twos', 'action']

/** How many cards each player starts with: 7 with two players and 5 with three or four, or always 7, or always 5. */
export type EightsHandRule = 'byPlayers' | 'seven' | 'five'
export const EIGHTS_HAND_RULES: readonly EightsHandRule[] = ['byPlayers', 'seven', 'five']

export interface EightsRules {
  draw: EightsDrawRule
  specials: EightsSpecials
  hand: EightsHandRule
}

export const DEFAULT_EIGHTS_RULES: EightsRules = { draw: 'untilPlayable', specials: 'eights', hand: 'byPlayers' }

export type EightsPhase =
  // `turn` plays a card, draws, or (with nothing to play and no more to draw) passes.
  | 'play'
  // `turn` has played an 8 and names the suit to follow.
  | 'suit'
  // Someone is out (or nobody could play or draw).
  | 'over'

/** One turn as everyone could see it. */
export interface EightsTurn {
  player: number
  /** The suit to follow when the turn began: a player who drew didn't have it (or the top card's rank). */
  facing: Suit
  /** Cards drawn: by choice, or for a 2. */
  drew: number
  played: Card | null
  /** The suit named with an 8. */
  named: Suit | null
  /** The turn lost: drew two for a 2, or skipped by a Queen. */
  lost: 'drawTwo' | 'skip' | null
  /** An Ace turned play the other way. */
  reversed: boolean
  out: boolean
}

export interface EightsState {
  players: number
  rules: EightsRules
  /** Each player's cards, in no order: the table sorts them. */
  hands: Card[][]
  /** Face down, top last. */
  stock: Card[]
  /** Face up, top last. */
  discard: Card[]
  /** The suit the next card must follow (or match the top card's rank, or be an 8): the top card's, or the one named
   * with an 8. */
  suit: Suit
  phase: EightsPhase
  turn: number
  /** 1 in seat order, -1 after an odd number of Aces (with the action cards). */
  direction: 1 | -1
  /** Cards the player whose turn it is has drawn this turn. */
  drawn: number
  /** Every turn so far, oldest first. */
  turns: EightsTurn[]
  /** Turns passed in a row with nothing to play and nothing to draw: once everyone has, the game ends. */
  passes: number
  /** Who played first: a rematch starts with the next player. */
  first: number
  /** The winner (or, if nobody could go out, everyone with the fewest cards), once the game is over. */
  winners: number[] | null
  /** How many times the discard has been shuffled back into the stock, for the shuffle's seed. */
  reshuffles: number
  seed: number
}
