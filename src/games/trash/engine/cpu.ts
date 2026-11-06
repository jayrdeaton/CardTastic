// How the CPU in seat 2 plays Trash, as pure decisions the screen runs on timers. Most of Trash plays itself: a card has
// one spot or none. The CPU's two choices are whether to take the discard, and where a wild goes. Hard puts a wild in
// the spot whose own rank it has seen the most of (face up on the table or gone by on the discard), since that spot is
// the hardest to fill; Easy puts it anywhere, and sometimes doesn't notice a useful discard.

import { type Card } from '@tastic/cards'

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { canTakeDiscard, heldSpots, isWild, layoutOf } from './rules'
import { type PlayerIndex, type TrashState } from './types'

interface CpuStyle {
  /** How often it draws from the stock when the discard would have done. */
  missDiscardChance: number
  /** Whether it reads the table to place a Jack, and how much of the discard it remembers. */
  jacks: 'anywhere' | 'top' | 'all'
}

export const TRASH_CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { missDiscardChance: 0.35, jacks: 'anywhere' },
  medium: { missDiscardChance: 0.1, jacks: 'top' },
  hard: { missDiscardChance: 0, jacks: 'all' }
}

/** How long it waits before each step, in ms. */
export const TRASH_CPU_STEP_MS: readonly [number, number] = [550, 850]

export function cpuStepDelayMs(rng: RandomFn): number {
  const [min, max] = TRASH_CPU_STEP_MS
  return Math.round(min + (max - min) * rng())
}

export function cpuDrawChoice(state: TrashState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): 'stock' | 'discard' {
  if (!canTakeDiscard(state, player)) return 'stock'
  return rng() < TRASH_CPU_STYLES[level].missDiscardChance ? 'stock' : 'discard'
}

/** The cards of a rank the CPU has seen: face up in either layout, and on the discard (its top only, or all of it). */
function seenOfRank(state: TrashState, rank: number, discardSeen: 'top' | 'all'): number {
  const visible: Card[] = [...state.layouts[0], ...state.layouts[1]].filter((card) => card.faceUp && !isWild(card, state.wild))
  const discard = discardSeen === 'all' ? state.discard : state.discard.slice(-1)
  return [...visible, ...discard].filter((card) => card.rank === rank).length
}

/** Where the card in hand goes: its spot, or for a Jack the face-down spot it picks. Null when it has no spot (it's
 * discarded). */
export function cpuPlaceChoice(state: TrashState, level: CpuLevel, rng: RandomFn): number | null {
  const spots = heldSpots(state)
  if (spots.length === 0) return null
  if (spots.length === 1 || !state.held || !isWild(state.held, state.wild)) return spots[0]
  const style = TRASH_CPU_STYLES[level]
  if (style.jacks === 'anywhere') return spots[Math.floor(rng() * spots.length)]
  // The spot whose rank is hardest to come by, the highest first on a tie (a high spot is the one left open longest).
  const layout = layoutOf(state, state.turn)
  let best = spots[0]
  let bestSeen = -1
  for (const spot of spots) {
    const seen = seenOfRank(state, spot + 1, style.jacks)
    if (seen > bestSeen || (seen === bestSeen && spot > best)) {
      best = spot
      bestSeen = seen
    }
  }
  return layout[best] ? best : spots[0]
}
