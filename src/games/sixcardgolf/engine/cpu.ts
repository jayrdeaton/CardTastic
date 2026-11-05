// How the CPU in seat 2 plays Six-Card Golf, as pure decisions the screen runs on timers: which two cards it turns up to
// start, whether it draws or takes the discard, and where the card goes. It weighs a face-down card at the deck's
// average. Its level sets how fussy it is about taking the discard and how often it simply plays a careless move.

import { type Card } from '@tastic/cards'

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { otherPlayer } from '@/games/table/players'

import { cardValue, columnPartner, columnScore, gridOf, gridScore } from './rules'
import { type GolfState, GRID_COLUMNS, GRID_SIZE, type PlayerIndex } from './types'

/** A face-down card's worth, on average: the 13 ranks' points over 13. */
export const UNKNOWN_VALUE = 71 / 13

interface CpuStyle {
  /** How much better a column has to get for it to take the discard. */
  takeGain: number
  /** How much better a column has to get for it to keep a drawn card rather than discard it. */
  keepGain: number
  /** How often it plays a careless move instead of its best one. */
  carelessChance: number
  /** How far its score has to be under the other player's guessed score for it to turn its last card up. */
  finishMargin: number
}

export const GOLF_CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { takeGain: 4, keepGain: 2, carelessChance: 0.3, finishMargin: -6 },
  medium: { takeGain: 3, keepGain: 1, carelessChance: 0.1, finishMargin: 0 },
  hard: { takeGain: 2, keepGain: 0.5, carelessChance: 0, finishMargin: 2 }
}

/** After this many turns in a hole, the CPU stops holding its last face-down card back and plays to end the hole. */
export const LONG_HOLE_TURNS = 30

/** How long it waits before each step (a flip, a draw, a placing), in ms. */
export const GOLF_CPU_STEP_MS: readonly [number, number] = [650, 1000]

export function cpuStepDelayMs(rng: RandomFn): number {
  const [min, max] = GOLF_CPU_STEP_MS
  return Math.round(min + (max - min) * rng())
}

/** A card's worth where it lies: its points face up, the average face down. */
function known(card: Card): number | null {
  return card.faceUp ? cardValue(card) : null
}

/** A column's score as far as the CPU can tell. */
function expectedColumn(top: Card, bottom: Card): number {
  if (top.faceUp && bottom.faceUp) return columnScore(top, bottom)
  return (known(top) ?? UNKNOWN_VALUE) + (known(bottom) ?? UNKNOWN_VALUE)
}

/** How much a card placed at `index` would lower the grid's expected score (negative: it would raise it). */
export function placementGain(grid: Card[], index: number, card: Card): number {
  const partner = grid[columnPartner(index)]
  const [top, bottom] = index < GRID_COLUMNS ? [grid[index], partner] : [partner, grid[index]]
  const before = expectedColumn(top, bottom)
  const placed = { ...card, faceUp: true }
  const after = partner.faceUp ? columnScore(placed, partner) : cardValue(placed) + UNKNOWN_VALUE
  return before - after
}

/** A guess at a grid's final score: face-up cards as they are, the rest at the average. */
export function guessedScore(grid: Card[]): number {
  let total = 0
  for (let column = 0; column < GRID_COLUMNS; column++) total += expectedColumn(grid[column], grid[column + GRID_COLUMNS])
  return total
}

/** Whether turning the grid's last card up with this move would end the hole on a score the CPU is happy with. On its
 * own last turn (the other player finished) anything goes. */
function finishingIsWelcome(state: GolfState, player: PlayerIndex, grid: Card[], level: CpuLevel): boolean {
  if (state.finisher !== null || state.turns >= LONG_HOLE_TURNS) return true
  const mine = gridScore(grid.map((card) => ({ ...card, faceUp: true })))
  // The other player gets one more turn, which should help them a little.
  const theirs = guessedScore(gridOf(state, otherPlayer(player))) - 2
  return mine + GOLF_CPU_STYLES[level].finishMargin <= theirs
}

/** The best place for `card` in the player's grid, with what it gains, leaving out a move that would finish the hole
 * on a score it doesn't like. Null when there's nowhere it's willing to put it. */
export function bestPlacement(state: GolfState, player: PlayerIndex, card: Card, level: CpuLevel): { index: number; gain: number } | null {
  const grid = gridOf(state, player)
  const downCount = grid.filter((c) => !c.faceUp).length
  // A long hole: turning a card up is worth more than a small saving, so the hole gets to its end.
  const hurry = state.turns >= LONG_HOLE_TURNS ? 4 : 0
  let best: { index: number; gain: number } | null = null
  for (let index = 0; index < GRID_SIZE; index++) {
    const gain = placementGain(grid, index, card) + (grid[index].faceUp ? 0 : hurry)
    if (downCount === 1 && !grid[index].faceUp) {
      const after = grid.map((c, i) => (i === index ? { ...card, faceUp: true } : c))
      if (!finishingIsWelcome(state, player, after, level)) continue
    }
    if (!best || gain > best.gain) best = { index, gain }
  }
  return best
}

/** The two cards it turns up to start: two of its face-down cards in different columns, at random. */
export function cpuOpeningFlips(state: GolfState, player: PlayerIndex, rng: RandomFn): number[] {
  const down = gridOf(state, player)
    .map((card, index) => (card.faceUp ? -1 : index))
    .filter((index) => index >= 0)
  const first = down[Math.floor(rng() * down.length)]
  const rest = down.filter((index) => index !== first && columnPartner(index) !== first)
  return [first, rest[Math.floor(rng() * rest.length)]]
}

/** Draw from the stock, or take the discard when it lowers a column by enough. */
export function cpuDrawChoice(state: GolfState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): 'stock' | 'discard' {
  const top = state.discard[state.discard.length - 1]
  if (!top) return 'stock'
  const style = GOLF_CPU_STYLES[level]
  if (rng() < style.carelessChance) return rng() < 0.5 ? 'stock' : 'discard'
  const best = bestPlacement(state, player, top, level)
  return best && best.gain >= style.takeGain ? 'discard' : 'stock'
}

/** Where the held card goes: an index of its grid, or the discard (only for a card drawn from the stock). */
export function cpuPlaceChoice(state: GolfState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): number | 'discard' {
  const held = state.held
  if (!held) return 'discard'
  const style = GOLF_CPU_STYLES[level]
  const canDiscard = held.from === 'stock'
  if (rng() < style.carelessChance) {
    if (canDiscard && rng() < 0.5) return 'discard'
    const grid = gridOf(state, player)
    // Careless, but never so careless it ends the hole on a whim: a face-down card unless it's the last one.
    const choices = grid.map((_, i) => i).filter((i) => grid.filter((c) => !c.faceUp).length > 1 || grid[i].faceUp)
    return choices[Math.floor(rng() * choices.length)]
  }
  const best = bestPlacement(state, player, held.card, level)
  if (canDiscard && (!best || best.gain < style.keepGain)) return 'discard'
  if (best) return best.index
  // Taken from the discard with nowhere it likes: the least bad face-up card to swap out.
  const grid = gridOf(state, player)
  let fallback = 0
  let fallbackGain = -Infinity
  grid.forEach((card, index) => {
    if (!card.faceUp && grid.filter((c) => !c.faceUp).length === 1) return
    const gain = placementGain(grid, index, held.card)
    if (gain > fallbackGain) {
      fallback = index
      fallbackGain = gain
    }
  })
  return fallback
}
