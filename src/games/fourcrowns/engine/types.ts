// Four Crowns' state: two decks' worth of hands, the stock and the discard, whose turn it is and what they're doing,
// what has been played this round (for the pass cover), the round just ended, and the running totals.

import { type AnyCard } from '@tastic/cards'

import type { CrownsArrangement } from './melds'

/** Two to four players, 0 to 3 in turn order (0 is seat 1). */
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

/** Which cards are in play (the setup screen's choice, Jay, 2026-11-06): both decks; both with four jokers, always wild;
 * or both without their Aces and 2s, with the jokers, so ranks run 3 to King like the rounds. */
export type CrownsDeck = 'plain' | 'jokers' | 'short'
export const CROWNS_DECKS: readonly CrownsDeck[] = ['plain', 'jokers', 'short']

/** What a face card left in hand costs: J 11, Q 12, K 13, or 10 each. */
export type CrownsFaces = 'ranked' | 'ten'
export const CROWNS_FACES: readonly CrownsFaces[] = ['ranked', 'ten']

/** What happens when someone goes out: everyone else has one last turn, or the round ends at once. */
export type CrownsLastTurns = 'everyone' | 'none'
export const CROWNS_LAST_TURNS: readonly CrownsLastTurns[] = ['everyone', 'none']

export interface CrownsRules {
  deck: CrownsDeck
  faces: CrownsFaces
  lastTurns: CrownsLastTurns
}

export const DEFAULT_CROWNS_RULES: CrownsRules = { deck: 'plain', faces: 'ranked', lastTurns: 'everyone' }

/** A joker left in hand costs this. */
export const JOKER_POINTS = 50

/** The first round deals this many cards each, and each round one more, to 13 in the last. */
export const FIRST_HAND_SIZE = 3
export const LAST_HAND_SIZE = 13
export const ROUNDS = LAST_HAND_SIZE - FIRST_HAND_SIZE + 1

/** A wild card left in hand at the end of a round costs this. */
export const WILD_POINTS = 20

export type CrownsPhase =
  // `turn` draws from the stock, or takes the discard.
  | 'draw'
  // `turn` holds one card more than the round deals, and throws one (going out if the rest all meld).
  | 'discard'
  | 'roundOver'
  | 'matchOver'

/** One turn as everyone else could have seen it: where the player drew from (the card, if it was the discard), what
 * they threw, and whether they went out with it. */
export interface CrownsTurn {
  player: number
  took: 'stock' | 'discard'
  /** The card taken from the discard. */
  card: AnyCard | null
  threw: AnyCard
  wentOut: boolean
}

export interface CrownsRoundResult {
  /** Who went out first. */
  out: number
  /** Each player's hand laid down at the end, in seat order. */
  shown: CrownsArrangement[]
  /** What each player scored this round (0 for anyone who melded every card). */
  points: number[]
}

export interface CrownsState {
  players: number
  /** The deck, what face cards cost, and whether everyone gets a last turn: the setup screen's choices. */
  rules: CrownsRules
  /** The round in play, from 1: it deals `FIRST_HAND_SIZE + round - 1` cards, and that rank is wild. */
  round: number
  /** Each player's cards, in no order: the table arranges them. */
  hands: AnyCard[][]
  /** Face down, top last. */
  stock: AnyCard[]
  /** Face up, top last. */
  discard: AnyCard[]
  phase: CrownsPhase
  turn: number
  dealer: number
  /** The card the player throwing took from the discard this turn (it can't be thrown straight back), or null. */
  taken: AnyCard | null
  /** Who went out this round, or null while nobody has. Everyone else then has one last turn (unless the round ends at
   * once). */
  out: number | null
  /** The players who still have their last turn once someone has gone out, next first. */
  lastTurns: number[]
  /** Every turn this round, oldest first. */
  turns: CrownsTurn[]
  /** The round just ended, while it shows. */
  result: CrownsRoundResult | null
  /** Each player's total so far: lowest wins. */
  totals: number[]
  /** Each finished round's scores, oldest first. */
  history: number[][]
  /** How many rounds each player has gone out first in, for the stats. */
  outs: number[]
  /** How many times the discard has been shuffled back into the stock this round, for the shuffle's seed. */
  reshuffles: number
  /** The players with the lowest total once the last round is over (more than one on a tie). */
  winners: number[] | null
  seed: number
}
