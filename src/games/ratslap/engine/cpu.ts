// How the CPU in seat 2 plays, as pure decisions the screen runs on timers: how long it waits before
// playing its card, and whether (and how quickly) it slaps the pile. Its level sets its speed and
// how often it misses a good pile or slaps a wrong one.

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { isOut, isSlappable } from './rules'
import { type PlayerIndex, type RatSlapState } from './types'

interface CpuStyle {
  /** How long it waits before playing a card, in ms. */
  playDelayMs: readonly [number, number]
  /** How long it takes to slap once it decides to, in ms. */
  slapDelayMs: readonly [number, number]
  /** How often it doesn't notice a good pile at all. */
  missChance: number
  /** How often it slaps a new top card that isn't a good pile. */
  wrongSlapChance: number
}

// A quick adult reacts in 250-400ms, so Hard can still be beaten, and Easy leaves a child time.
export const CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { playDelayMs: [700, 1100], slapDelayMs: [1000, 1500], missChance: 0.3, wrongSlapChance: 0.03 },
  medium: { playDelayMs: [550, 850], slapDelayMs: [650, 1000], missChance: 0.12, wrongSlapChance: 0.01 },
  hard: { playDelayMs: [420, 650], slapDelayMs: [380, 600], missChance: 0.03, wrongSlapChance: 0 }
}

function between([min, max]: readonly [number, number], rng: RandomFn): number {
  return Math.round(min + (max - min) * rng())
}

export function cpuPlayDelayMs(level: CpuLevel, rng: RandomFn): number {
  return between(CPU_STYLES[level].playDelayMs, rng)
}

/** What the CPU does about the pile as it stands now: slap after `delayMs`, or nothing. Asked once
 * each time the pile changes; the screen drops the plan if the pile changes again before it fires. */
export function cpuSlapPlan(state: RatSlapState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): { delayMs: number } | null {
  if (state.winner !== null || state.pileWonBySlap) return null
  const style = CPU_STYLES[level]
  if (isSlappable(state)) return rng() < style.missChance ? null : { delayMs: between(style.slapDelayMs, rng) }
  // A wrong slap only on a fresh card in play, and never one that would lose the match outright.
  if (state.pileWinner !== null || state.pile.length < 2 || isOut(state, player)) return null
  return rng() < style.wrongSlapChance ? { delayMs: between(style.slapDelayMs, rng) } : null
}
