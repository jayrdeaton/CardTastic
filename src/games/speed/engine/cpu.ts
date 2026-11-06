// How the CPU in seat 2 plays Speed: there are no turns, so it plays on its own clock, a card every so often while it has
// one to play. Its level sets how often (a quick adult plays a card about every half second while they can).

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { bestPile, handOf, pilesFor } from './rules'
import { type PlayerIndex, type SpeedState } from './types'

/** How long the CPU takes over each card, in ms. */
export const SPEED_CPU_PACE: Record<CpuLevel, readonly [number, number]> = {
  easy: [1100, 1600],
  medium: [750, 1100],
  hard: [480, 720]
}

export function cpuPaceMs(level: CpuLevel, rng: RandomFn): number {
  const [min, max] = SPEED_CPU_PACE[level]
  return Math.round(min + (max - min) * rng())
}

/** The card it plays next, and where: the first card in its hand that fits, onto its best pile (bestPile). Null when it
 * has nothing to play. */
export function cpuMove(state: SpeedState, player: PlayerIndex): { slot: number; pile: number } | null {
  const hand = handOf(state, player)
  for (let slot = 0; slot < hand.length; slot++) {
    const card = hand[slot]
    if (!card || pilesFor(state, card).length === 0) continue
    const pile = bestPile(state, player, slot)
    if (pile !== null) return { slot, pile }
  }
  return null
}
