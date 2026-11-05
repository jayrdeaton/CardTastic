// Six-Card Golf for two players, as pure functions over one state. Every function that changes the state returns a new
// one, or null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-04: six cards, nothing hidden from anyone, so it plays on one phone):
// - Each player has six cards face down in two rows of three, and turns two of them face up to start.
// - On a turn, draw the stock's top card or take the discard's. Swap it for any one of your six (the one swapped out goes
//   face up on the discard), or, drawn from the stock, discard it.
// - Once a player's six are all face up, the other player has one more turn, then every card turns over and the hole is
//   scored: Ace 1, 2 minus 2, 3 to 10 their number, Jack and Queen 10, King 0, and a pair in a column (two of a rank, one
//   above the other) scores 0.
// - The lowest total after the last hole wins. It can end level.

import { type Card } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'
import { otherPlayer } from '@/games/table/players'

import { type GolfState, GRID_COLUMNS, GRID_SIZE, OPENING_FLIPS, type PlayerIndex } from './types'

/** A card's points. */
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 1:
      return 1
    case 2:
      return -2
    case 11:
    case 12:
      return 10
    case 13:
      return 0
    default:
      return card.rank
  }
}

export function gridOf(state: GolfState, player: PlayerIndex): Card[] {
  return state.grids[player - 1]
}

/** The other card in a card's column. */
export function columnPartner(index: number): number {
  return index < GRID_COLUMNS ? index + GRID_COLUMNS : index - GRID_COLUMNS
}

/** What a column of two face-up cards scores: 0 for a pair, else both cards' points. */
export function columnScore(top: Card, bottom: Card): number {
  return top.rank === bottom.rank ? 0 : cardValue(top) + cardValue(bottom)
}

/** A whole grid's score, every card counted as if face up. */
export function gridScore(grid: Card[]): number {
  let total = 0
  for (let column = 0; column < GRID_COLUMNS; column++) total += columnScore(grid[column], grid[column + GRID_COLUMNS])
  return total
}

/** What a grid shows so far: face-up cards only, and a pair only when both of its cards are up. */
export function showingScore(grid: Card[]): number {
  let total = 0
  for (let column = 0; column < GRID_COLUMNS; column++) {
    const top = grid[column]
    const bottom = grid[column + GRID_COLUMNS]
    if (top.faceUp && bottom.faceUp) total += columnScore(top, bottom)
    else if (top.faceUp) total += cardValue(top)
    else if (bottom.faceUp) total += cardValue(bottom)
  }
  return total
}

export function isGridUp(grid: Card[]): boolean {
  return grid.every((card) => card.faceUp)
}

/** Every finished hole's scores added up, per player. */
export function totals(state: GolfState): [number, number] {
  const sum = (scores: number[]) => scores.reduce((a, b) => a + b, 0)
  return [sum(state.scores[0]), sum(state.scores[1])]
}

/** The match's winner once it's over: the lower total, or null for a tie (or a match still on). */
export function matchWinner(state: GolfState): PlayerIndex | null {
  if (state.phase !== 'matchOver') return null
  const [one, two] = totals(state)
  return one === two ? null : one < two ? 1 : 2
}

function withGrid(grids: [Card[], Card[]], player: PlayerIndex, grid: Card[]): [Card[], Card[]] {
  return player === 1 ? [grid, grids[1]] : [grids[0], grid]
}

/** Each hole is dealt from its own shuffle of the match's seed. */
function holeSeed(seed: number, hole: number, reshuffle = 0): number {
  return (seed + Math.imul(hole, 0x9e3779b1) + Math.imul(reshuffle + 1, 0x85ebca6b)) >>> 0
}

/** Deals a hole: six cards face down each, the rest the stock, its top card turned onto the discard. */
function dealHole(state: Omit<GolfState, 'grids' | 'stock' | 'discard' | 'phase' | 'turn' | 'toFlip' | 'held' | 'finisher' | 'reshuffles' | 'turns'>): GolfState {
  const deck = shuffle(makeDeck(), mulberry32(holeSeed(state.seed, state.hole)))
  const grids: [Card[], Card[]] = [deck.slice(0, GRID_SIZE), deck.slice(GRID_SIZE, GRID_SIZE * 2)]
  const stock = deck.slice(GRID_SIZE * 2)
  const first = stock.pop()!
  return { ...state, grids, stock, discard: [{ ...first, faceUp: true }], phase: 'flip', turn: state.starter, toFlip: [OPENING_FLIPS, OPENING_FLIPS], held: null, finisher: null, reshuffles: 0, turns: 0 }
}

export function createGolfMatch(seed: number, holes: number, starter: PlayerIndex = 1): GolfState {
  return dealHole({ holes, hole: 1, scores: [[], []], starter, seed })
}

/** The next hole, its first turn to the other player. */
export function nextHole(state: GolfState): GolfState | null {
  if (state.phase !== 'holeOver') return null
  return dealHole({ holes: state.holes, hole: state.hole + 1, scores: state.scores, starter: otherPlayer(state.starter), seed: state.seed })
}

/** One of a player's opening flips: a face-down card of theirs turned up. Both players flip at once. */
export function flipOpening(state: GolfState, player: PlayerIndex, index: number): GolfState | null {
  if (state.phase !== 'flip' || state.toFlip[player - 1] <= 0) return null
  const grid = gridOf(state, player)
  if (!grid[index] || grid[index].faceUp) return null
  const flipped = grid.map((card, i) => (i === index ? { ...card, faceUp: true } : card))
  const toFlip: [number, number] = player === 1 ? [state.toFlip[0] - 1, state.toFlip[1]] : [state.toFlip[0], state.toFlip[1] - 1]
  const done = toFlip[0] === 0 && toFlip[1] === 0
  return { ...state, grids: withGrid(state.grids, player, flipped), toFlip, phase: done ? 'draw' : 'flip' }
}

/** Whose move it is: the player to draw or place, or null in the opening flips and between holes. */
export function toMove(state: GolfState): PlayerIndex | null {
  return state.phase === 'draw' || state.phase === 'place' ? state.turn : null
}

/** The stock's top card into the player's hand. An empty stock is first refilled from the discard (all but its top),
 * shuffled. */
export function drawStock(state: GolfState, player: PlayerIndex): GolfState | null {
  if (state.phase !== 'draw' || state.turn !== player) return null
  let { stock, discard, reshuffles } = state
  if (stock.length === 0) {
    if (discard.length < 2) return null
    reshuffles++
    stock = shuffle(
      discard.slice(0, -1).map((card) => ({ ...card, faceUp: false })),
      mulberry32(holeSeed(state.seed, state.hole, reshuffles))
    )
    discard = discard.slice(-1)
  }
  const card = stock[stock.length - 1]
  return { ...state, stock: stock.slice(0, -1), discard, reshuffles, held: { card: { ...card, faceUp: true }, from: 'stock' }, phase: 'place' }
}

/** The discard's top card into the player's hand. It has to go into their grid. */
export function takeDiscard(state: GolfState, player: PlayerIndex): GolfState | null {
  if (state.phase !== 'draw' || state.turn !== player || state.discard.length === 0) return null
  const card = state.discard[state.discard.length - 1]
  return { ...state, discard: state.discard.slice(0, -1), held: { card, from: 'discard' }, phase: 'place' }
}

/** The held card into the player's grid at `index`, face up; the card it replaces goes face up onto the discard. */
export function swapInto(state: GolfState, player: PlayerIndex, index: number): GolfState | null {
  if (state.phase !== 'place' || state.turn !== player || !state.held) return null
  const grid = gridOf(state, player)
  const out = grid[index]
  if (!out) return null
  const swapped = grid.map((card, i) => (i === index ? state.held!.card : card))
  return endTurn({ ...state, grids: withGrid(state.grids, player, swapped), discard: [...state.discard, { ...out, faceUp: true }], held: null }, player)
}

/** A card drawn from the stock, discarded. One taken from the discard can't go back. */
export function discardHeld(state: GolfState, player: PlayerIndex): GolfState | null {
  if (state.phase !== 'place' || state.turn !== player || state.held?.from !== 'stock') return null
  return endTurn({ ...state, discard: [...state.discard, state.held.card], held: null }, player)
}

/** After a player's turn: the first to have all six up is the finisher, and the hole ends once the turn comes back to
 * them (the other player has had their last turn). */
function endTurn(state: GolfState, player: PlayerIndex): GolfState {
  const finisher = state.finisher ?? (isGridUp(gridOf(state, player)) ? player : null)
  const next = otherPlayer(player)
  const turns = state.turns + 1
  if (finisher !== null && next === finisher) return scoreHole({ ...state, finisher, turns })
  return { ...state, finisher, turn: next, phase: 'draw', turns }
}

/** Every card turns over and the hole's scores are added. */
function scoreHole(state: GolfState): GolfState {
  const grids: [Card[], Card[]] = [state.grids[0].map((card) => ({ ...card, faceUp: true })), state.grids[1].map((card) => ({ ...card, faceUp: true }))]
  const scores: [number[], number[]] = [
    [...state.scores[0], gridScore(grids[0])],
    [...state.scores[1], gridScore(grids[1])]
  ]
  return { ...state, grids, scores, phase: state.hole >= state.holes ? 'matchOver' : 'holeOver' }
}

/** Every card in play. Always the whole deck. */
export function cardCount(state: GolfState): number {
  return state.grids[0].length + state.grids[1].length + state.stock.length + state.discard.length + (state.held ? 1 : 0)
}
