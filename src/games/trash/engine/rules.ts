// Trash (also called Garbage) for two players, as pure functions over one state. Every function that changes the state
// returns a new one, or null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-04: Jacks wild):
// - Each player has ten spots, Ace to 10, each dealt a card face down.
// - On a turn, draw the stock's top card, or take the discard's if it has a spot. A card goes in its own spot if that
//   spot is face down, or holds a Jack; the card that was there comes up into your hand and you play on with it.
// - A Jack goes in any face-down spot. A Jack sitting in a spot comes back up when the spot's own card arrives, and plays
//   on too. A Queen or a King, or a card whose spot is already filled, is discarded, and the turn passes.
// - The first to fill every spot wins the round and plays the next one with one spot fewer. Win a round with a single
//   spot to win the match. The round's loser plays first in the next one.

import { type Card } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'
import { otherPlayer } from '@/games/table/players'

import { MAX_SPOTS, type PlayerIndex, type TrashState } from './types'

export function isWild(card: Card): boolean {
  return card.rank === 11
}

export function layoutOf(state: TrashState, player: PlayerIndex): Card[] {
  return state.layouts[player - 1]
}

/** The spot a card belongs in (its rank - 1), or null for a card with no spot of its own (a Jack, Queen or King, or a
 * rank beyond the player's spots). */
export function homeSpot(card: Card, size: number): number | null {
  return card.rank <= Math.min(size, MAX_SPOTS) ? card.rank - 1 : null
}

/** Where a card can go in a layout: its own spot while that spot is face down or holds a Jack; a Jack, any face-down
 * spot. Empty when it has nowhere to go. */
export function spotsFor(card: Card, layout: Card[]): number[] {
  if (isWild(card)) return layout.flatMap((spot, i) => (spot.faceUp ? [] : [i]))
  const home = homeSpot(card, layout.length)
  if (home === null) return []
  const spot = layout[home]
  return !spot.faceUp || isWild(spot) ? [home] : []
}

export function isFilled(layout: Card[]): boolean {
  return layout.every((spot) => spot.faceUp)
}

/** How many of a player's spots are still face down. */
export function spotsLeft(layout: Card[]): number {
  return layout.filter((spot) => !spot.faceUp).length
}

function withLayout(layouts: [Card[], Card[]], player: PlayerIndex, layout: Card[]): [Card[], Card[]] {
  return player === 1 ? [layout, layouts[1]] : [layouts[0], layout]
}

function roundSeed(seed: number, round: number, reshuffle = 0): number {
  return (seed + Math.imul(round, 0x9e3779b1) + Math.imul(reshuffle + 1, 0x85ebca6b)) >>> 0
}

/** Deals a round: each player's spots face down, the rest the stock, its top card turned onto the discard. */
function dealRound(seed: number, round: number, sizes: [number, number], starter: PlayerIndex): TrashState {
  const deck = shuffle(makeDeck(), mulberry32(roundSeed(seed, round)))
  const layouts: [Card[], Card[]] = [deck.slice(0, sizes[0]), deck.slice(sizes[0], sizes[0] + sizes[1])]
  const stock = deck.slice(sizes[0] + sizes[1])
  const first = stock.pop()!
  return { sizes, layouts, stock, discard: [{ ...first, faceUp: true }], phase: 'draw', turn: starter, held: null, heldFrom: null, roundWinner: null, winner: null, round, seed, reshuffles: 0 }
}

export function createTrashMatch(seed: number, spots: number = MAX_SPOTS, starter: PlayerIndex = 1): TrashState {
  return dealRound(seed, 1, [spots, spots], starter)
}

/** The next round: the last round's winner with one spot fewer, its loser playing first. */
export function nextRound(state: TrashState): TrashState | null {
  if (state.phase !== 'roundOver' || state.roundWinner === null) return null
  const winner = state.roundWinner
  const sizes: [number, number] = winner === 1 ? [state.sizes[0] - 1, state.sizes[1]] : [state.sizes[0], state.sizes[1] - 1]
  return dealRound(state.seed, state.round + 1, sizes, otherPlayer(winner))
}

/** Whose move it is, or null between rounds. */
export function toMove(state: TrashState): PlayerIndex | null {
  return state.phase === 'draw' || state.phase === 'place' ? state.turn : null
}

/** Whether the discard's top card has a spot in the player's layout, so they may take it. */
export function canTakeDiscard(state: TrashState, player: PlayerIndex): boolean {
  const top = state.discard[state.discard.length - 1]
  return !!top && spotsFor(top, layoutOf(state, player)).length > 0
}

/** Where the card in hand can go: empty when it has no spot, and is discarded. */
export function heldSpots(state: TrashState): number[] {
  return state.held && state.phase === 'place' ? spotsFor(state.held, layoutOf(state, state.turn)) : []
}

export function drawStock(state: TrashState, player: PlayerIndex): TrashState | null {
  if (state.phase !== 'draw' || state.turn !== player) return null
  let { stock, discard, reshuffles } = state
  if (stock.length === 0) {
    if (discard.length < 2) return null
    reshuffles++
    stock = shuffle(
      discard.slice(0, -1).map((card) => ({ ...card, faceUp: false })),
      mulberry32(roundSeed(state.seed, state.round, reshuffles))
    )
    discard = discard.slice(-1)
  }
  const card = stock[stock.length - 1]
  return { ...state, stock: stock.slice(0, -1), discard, reshuffles, held: { ...card, faceUp: true }, heldFrom: 'stock', phase: 'place' }
}

export function takeDiscard(state: TrashState, player: PlayerIndex): TrashState | null {
  if (state.phase !== 'draw' || state.turn !== player || !canTakeDiscard(state, player)) return null
  return { ...state, held: state.discard[state.discard.length - 1], heldFrom: 'discard', discard: state.discard.slice(0, -1), phase: 'place' }
}

/** The card in hand into spot `index`; the card that was there comes up into the player's hand. Filling the last spot
 * wins the round (the card picked up from it goes to the discard). */
export function placeHeld(state: TrashState, player: PlayerIndex, index: number): TrashState | null {
  if (state.phase !== 'place' || state.turn !== player || !state.held) return null
  const layout = layoutOf(state, player)
  if (!spotsFor(state.held, layout).includes(index)) return null
  const pickedUp = { ...layout[index], faceUp: true }
  const placed = layout.map((spot, i) => (i === index ? { ...state.held!, faceUp: true } : spot))
  const next: TrashState = { ...state, layouts: withLayout(state.layouts, player, placed), held: pickedUp, heldFrom: 'layout' }
  if (!isFilled(placed)) return next
  const winner = state.sizes[player - 1] === 1 ? player : null
  return { ...next, discard: [...next.discard, pickedUp], held: null, heldFrom: null, roundWinner: player, winner, phase: winner ? 'matchOver' : 'roundOver' }
}

/** A card in hand with no spot goes onto the discard, and the turn passes. */
export function discardHeld(state: TrashState, player: PlayerIndex): TrashState | null {
  if (state.phase !== 'place' || state.turn !== player || !state.held || heldSpots(state).length > 0) return null
  return { ...state, discard: [...state.discard, state.held], held: null, heldFrom: null, turn: otherPlayer(player), phase: 'draw' }
}

/** Every card in play. Always the whole deck. */
export function cardCount(state: TrashState): number {
  return state.layouts[0].length + state.layouts[1].length + state.stock.length + state.discard.length + (state.held ? 1 : 0)
}
