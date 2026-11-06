// War for two players, as pure functions over one state. Every function that changes the state returns a new one, or
// null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-05):
// - The deck is split in two. Both players turn over their top card; the higher takes both. Aces are high.
// - A tie is a war: each puts three cards face down (or one, the setup screen's choice) and one face up, and the higher face-up card takes everything in the
//   battle. A tie again is another war. A player with fewer than four cards for a war plays what they have, the last one
//   face up; one with none left can't go to war and loses the battle.
// - A won battle goes under the winner's deck, shuffled (collected in order, a War deck can go round for ever).
// - A full game ends when one player has every card. A short game ends after SHORT_GAME_BATTLES battles, most cards
//   winning; it can end level.

import { type Card } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'
import { otherPlayer } from '@/games/table/players'

import { type BattleCard, type PlayerIndex, SHORT_GAME_BATTLES, type WarDown, type WarLength, type WarState } from './types'

/** A card's strength: 2 lowest, Ace highest. */
export function warValue(card: Card): number {
  return card.rank === 1 ? 14 : card.rank
}

export function handOf(state: WarState, player: PlayerIndex): Card[] {
  return state.hands[player - 1]
}

function both<T>(pair: [T, T], player: PlayerIndex, value: T): [T, T] {
  return player === 1 ? [value, pair[1]] : [pair[0], value]
}

export function createWarMatch(seed: number, length: WarLength, down: WarDown = 3): WarState {
  const deck = shuffle(makeDeck(), mulberry32(seed))
  return { length, down, hands: [deck.slice(0, 26), deck.slice(26)], battle: [[], []], played: [false, false], war: false, battleWinner: null, battles: 0, wars: 0, winner: null, seed }
}

/** Whether the player can play their part of the step in play now. */
export function canPlay(state: WarState, player: PlayerIndex): boolean {
  return state.winner === null && state.battleWinner === null && !state.played[player - 1] && handOf(state, player).length > 0
}

/** The face-up card a player's part of the battle stands on: the last one they turned over. */
export function battleCard(state: WarState, player: PlayerIndex): Card | null {
  const cards = state.battle[player - 1]
  for (let i = cards.length - 1; i >= 0; i--) if (cards[i].faceUp) return cards[i].card
  return null
}

/** The player's part of the step: their top card face up, or for a war three (or one) face down and one face up (fewer when they
 * haven't four). Once both have played, the step is settled. */
export function playStep(state: WarState, player: PlayerIndex): WarState | null {
  if (!canPlay(state, player)) return null
  const hand = handOf(state, player)
  const count = state.war ? Math.min(hand.length, state.down + 1) : 1
  const taken = hand.slice(hand.length - count).reverse()
  const cards: BattleCard[] = taken.map((card, i) => ({ card: { ...card, faceUp: i === count - 1 }, faceUp: i === count - 1 }))
  const next: WarState = {
    ...state,
    hands: both(state.hands, player, hand.slice(0, hand.length - count)),
    battle: both(state.battle, player, [...state.battle[player - 1], ...cards]),
    played: both(state.played, player, true)
  }
  return next.played[0] && next.played[1] ? settle(next) : next
}

/** Both have played: the higher face-up card wins the battle, and a tie is a war, unless a player has nothing left to go
 * to war with. */
function settle(state: WarState): WarState {
  const one = warValue(battleCard(state, 1)!)
  const two = warValue(battleCard(state, 2)!)
  if (one !== two) return { ...state, battleWinner: one > two ? 1 : 2 }
  const outOne = state.hands[0].length === 0
  const outTwo = state.hands[1].length === 0
  if (outOne && outTwo) return { ...state, winner: 'tie' }
  if (outOne || outTwo) return { ...state, wars: state.wars + 1, battleWinner: outOne ? 2 : 1 }
  return { ...state, war: true, wars: state.wars + 1, played: [false, false] }
}

/** The battle's winner takes every card in it, shuffled, under their deck. Then a match can end: the other player is out
 * of cards, or a short game has had its battles. */
export function collectBattle(state: WarState): WarState | null {
  const winner = state.battleWinner
  if (winner === null || state.winner !== null) return null
  const won = shuffle(
    [...state.battle[0], ...state.battle[1]].map(({ card }) => ({ ...card, faceUp: false })),
    mulberry32((state.seed + Math.imul(state.battles + 1, 0x9e3779b1)) >>> 0)
  )
  const battles = state.battles + 1
  const hands = both(state.hands, winner, [...won, ...handOf(state, winner)])
  const collected: WarState = { ...state, hands, battle: [[], []], played: [false, false], war: false, battleWinner: null, battles }
  if (hands[otherPlayer(winner) - 1].length === 0) return { ...collected, winner }
  if (state.length === 'short' && battles >= SHORT_GAME_BATTLES) {
    const [one, two] = [hands[0].length, hands[1].length]
    return { ...collected, winner: one === two ? 'tie' : one > two ? 1 : 2 }
  }
  return collected
}

/** Every card in play: both decks and the battle. Always the whole deck. */
export function cardCount(state: WarState): number {
  return state.hands[0].length + state.hands[1].length + state.battle[0].length + state.battle[1].length
}
