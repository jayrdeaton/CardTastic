// RatSlap (Egyptian Ratscrew) for two players, as pure functions over one state. Every function
// that changes the state returns a new one, or null for a move the rules don't allow.
//
// Ported from ~/Developer/EgyptianRatscrew's engine on 2026-11-04 and brought in line with the rules
// Jay settled that day:
// - Doubles, sandwiches and the jokers can each be switched off (RatSlapRules).
// - A won pile goes under the winner's deck, not on top of it.
// - Burned cards sit apart from the played ones and never make a double or a sandwich.
// - A slap still beats a face-card win while the pile waits to be collected.
// - Out of cards, you can't play, but a good slap gets you back in. You lose when the other player
//   collects a pile while you're out, or if you slap wrong with nothing to burn.

import { type AnyCard, isJoker, type Rank } from '@tastic/cards'

import { dealHands, shuffledDeck } from './deck'
import { isDouble, isSandwich } from './slapLogic'
import { type PlayerIndex, type RatSlapRules, type RatSlapState, type SlapPattern } from './types'

export function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 1 ? 2 : 1
}

export function handOf(state: RatSlapState, player: PlayerIndex): AnyCard[] {
  return state.hands[player - 1]
}

function withHand(hands: [AnyCard[], AnyCard[]], player: PlayerIndex, hand: AnyCard[]): [AnyCard[], AnyCard[]] {
  return player === 1 ? [hand, hands[1]] : [hands[0], hand]
}

/** The tries a face card gives the other player: J 1, Q 2, K 3, A 4. Null for a number card. */
export function chancesFor(rank: Rank): number | null {
  switch (rank) {
    case 1:
      return 4
    case 11:
      return 1
    case 12:
      return 2
    case 13:
      return 3
    default:
      return null
  }
}

export function createInitialState(seed: number, rules: RatSlapRules, firstPlayer: PlayerIndex = 1): RatSlapState {
  const [handOne, handTwo] = dealHands(shuffledDeck(seed, rules.jokers))
  return { rules, hands: [handOne, handTwo], pile: [], burned: [], turn: firstPlayer, challenge: null, lastPlayer: null, pileWinner: null, pileWonBySlap: false, winner: null }
}

export function isOut(state: RatSlapState, player: PlayerIndex): boolean {
  return handOf(state, player).length === 0
}

/** Who plays the next card, or null while a won pile waits to be collected or once the match is
 * over. */
export function toPlay(state: RatSlapState): PlayerIndex | null {
  if (state.winner !== null || state.pileWinner !== null) return null
  return state.challenge ? state.challenge.defender : state.turn
}

export function isPlayable(state: RatSlapState, player: PlayerIndex): boolean {
  return toPlay(state) === player && !isOut(state, player)
}

/** The pile's winner, waiting to collect it. A face-card win can still be slapped away. */
function winPile(state: RatSlapState, player: PlayerIndex, bySlap: boolean): RatSlapState {
  return { ...state, challenge: null, pileWinner: player, pileWonBySlap: bySlap }
}

/** After a card leaves a hand: a challenge's defender with no cards can't answer, so the attacker
 * wins the pile; with no challenge, a turn passes over a player who is out; and once neither player
 * has a card, the pile goes to whoever played its top card. */
function settle(state: RatSlapState): RatSlapState {
  if (state.challenge) {
    if (isOut(state, state.challenge.defender)) return winPile(state, state.challenge.attacker, false)
    return state
  }
  if (!isOut(state, state.turn)) return state
  const other = otherPlayer(state.turn)
  if (!isOut(state, other)) return { ...state, turn: other }
  return winPile(state, state.lastPlayer ?? other, false)
}

export function playCard(state: RatSlapState, player: PlayerIndex): RatSlapState | null {
  if (!isPlayable(state, player)) return null

  const hand = handOf(state, player)
  const card: AnyCard = { ...hand[hand.length - 1], faceUp: true }
  const other = otherPlayer(player)
  const challenge = state.challenge
  const played: RatSlapState = { ...state, hands: withHand(state.hands, player, hand.slice(0, -1)), pile: [...state.pile, card], lastPlayer: player }

  // A joker cancels a challenge however many tries are used, and plays on as an ordinary card.
  if (isJoker(card)) return settle({ ...played, challenge: null, turn: other })

  // A face card opens a challenge, or answers one and turns it round on the attacker.
  const chances = chancesFor(card.rank)
  if (chances !== null) {
    const defender = challenge ? challenge.attacker : other
    return settle({ ...played, challenge: { triggerCard: card, requiredChances: chances, chancesUsed: 0, attacker: player, defender }, turn: defender })
  }

  if (!challenge) return settle({ ...played, turn: other })

  // A number card used one of the defender's tries; with none left, the attacker wins the pile.
  const chancesUsed = challenge.chancesUsed + 1
  if (chancesUsed >= challenge.requiredChances) return winPile(played, challenge.attacker, false)
  return settle({ ...played, challenge: { ...challenge, chancesUsed } })
}

/** The pattern a slap would win on, under the match's rules, or null. */
export function slapPattern(state: RatSlapState): SlapPattern | null {
  if (state.rules.doubles && isDouble(state.pile)) return 'double'
  if (state.rules.sandwiches && isSandwich(state.pile)) return 'sandwich'
  return null
}

export function isSlappable(state: RatSlapState): boolean {
  if (state.winner !== null || state.pileWonBySlap) return false
  return slapPattern(state) !== null
}

/** A slap. A good one wins the pile, even mid-challenge or from a face-card win still waiting to be
 * collected. A wrong one burns the slapper's top card under the pile, or loses the match for a
 * player with no card to burn. Null when the slap comes too late to count: the match is over, or
 * the pile was already slapped. */
export function slap(state: RatSlapState, player: PlayerIndex): RatSlapState | null {
  if (state.winner !== null || state.pileWonBySlap) return null

  if (isSlappable(state)) return winPile(state, player, true)

  const hand = handOf(state, player)
  if (hand.length === 0) return { ...state, winner: otherPlayer(player) }

  const burnedCard: AnyCard = { ...hand[hand.length - 1], faceUp: false }
  const burned: RatSlapState = { ...state, hands: withHand(state.hands, player, hand.slice(0, -1)), burned: [burnedCard, ...state.burned] }
  return burned.pileWinner === null ? settle(burned) : burned
}

/** The winner takes the pile and its burned cards, turned over, under their deck, and plays next.
 * Collecting a pile while the other player is out wins the match. */
export function collectPile(state: RatSlapState, player: PlayerIndex): RatSlapState | null {
  if (state.pileWinner !== player || state.winner !== null) return null

  // Bottom to top as it lies: burned cards under the played ones. Turned over, its top card ends up
  // at the bottom of the hand.
  const stack = [...state.burned, ...state.pile].map((card) => ({ ...card, faceUp: false }))
  const hand = [...stack.reverse(), ...handOf(state, player)]
  const collected: RatSlapState = {
    ...state,
    hands: withHand(state.hands, player, hand),
    pile: [],
    burned: [],
    turn: player,
    challenge: null,
    lastPlayer: null,
    pileWinner: null,
    pileWonBySlap: false
  }
  return isOut(collected, otherPlayer(player)) ? { ...collected, winner: player } : collected
}

/** Every card in play: both hands, the pile and the burned cards. Always the whole deck. */
export function cardCount(state: RatSlapState): number {
  return state.hands[0].length + state.hands[1].length + state.pile.length + state.burned.length
}
