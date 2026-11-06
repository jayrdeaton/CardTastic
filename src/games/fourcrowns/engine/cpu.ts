// How a CPU plays Four Crowns, as pure decisions the screen runs on timers: whether to take the discard, which card to
// throw, and whether to go out.
//
// Every level goes out the moment it can, takes a wild from the discard, takes a card that would leave fewer points in
// hand, and throws the card whose loss leaves the fewest (the costlier on a tie). It holds on to its wilds until its last
// turn, counting a loose one as nothing meanwhile: any pair and a wild make a meld (a CPU that threw loose wilds for
// their 20 points lost 60% of its matches to one that kept them). Easy often misses a useful discard and often throws a
// loose card at random; Medium now and then; Hard never. In simulated two-player matches (300 each), Hard beats Medium
// about 61% of the time, Medium beats Easy about 66% and Hard beats Easy about 72%: the deal decides a lot. Weighing what
// loose cards could still become (two of a rank, two of a suit a rank or two apart) made Hard worse, not better: it kept
// high pairs that cost it when someone went out.

import { type Card } from '@tastic/cards'

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { bestArrangement, cardPoints, isWild } from './melds'
import { canGoOut, canThrow, discardTop, wildRank } from './rules'
import { type CrownsState, WILD_POINTS } from './types'

interface CpuStyle {
  /** How often it draws from the stock when the discard would have helped. */
  missDiscardChance: number
  /** How often it throws a loose card (never a wild) at random instead of its best throw. */
  sloppyThrowChance: number
}

export const CROWNS_CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { missDiscardChance: 0.35, sloppyThrowChance: 0.3 },
  medium: { missDiscardChance: 0.15, sloppyThrowChance: 0.1 },
  hard: { missDiscardChance: 0, sloppyThrowChance: 0 }
}

/** How long it waits before each step, in ms. */
export const CROWNS_CPU_STEP_MS: readonly [number, number] = [600, 950]

export function cpuStepDelayMs(rng: RandomFn): number {
  const [min, max] = CROWNS_CPU_STEP_MS
  return Math.round(min + (max - min) * rng())
}

/** How good a hand is to keep, lower is better: its points in hand, with a loose wild counted as nothing while it isn't
 * the last turn (`keepWilds`), since any pair and a wild make a meld. */
function keepScore(cards: readonly Card[], rank: number, keepWilds: boolean): number {
  const arrangement = bestArrangement(cards, rank)
  return keepWilds ? arrangement.points - arrangement.loose.filter((card) => isWild(card, rank)).length * WILD_POINTS : arrangement.points
}

/** The best card to throw from `cards` (one of `throwable`), and how good what's left is. Keeping wilds, it throws one
 * only when nothing else can go. */
function bestThrow(cards: readonly Card[], throwable: readonly Card[], rank: number, keepWilds: boolean): { card: Card; score: number } {
  const plain = keepWilds ? throwable.filter((card) => !isWild(card, rank)) : []
  let best: { card: Card; score: number } | null = null
  for (const card of plain.length > 0 ? plain : throwable) {
    const score = keepScore(
      cards.filter((c) => c.id !== card.id),
      rank,
      keepWilds
    )
    // Fewest points left; on a tie, throw the costlier card.
    if (!best || score < best.score || (score === best.score && cardPoints(card, rank) > cardPoints(best.card, rank))) best = { card, score }
  }
  return best!
}

/** Whether to take the discard's top card rather than draw from the stock. */
export function cpuTakesDiscard(state: CrownsState, player: number, level: CpuLevel, rng: RandomFn): boolean {
  const top = discardTop(state)
  if (!top) return false
  const style = CROWNS_CPU_STYLES[level]
  const rank = wildRank(state)
  const hand = state.hands[player]
  const keepWilds = state.out === null
  const helps = isWild(top, rank) || bestThrow([...hand, top], hand, rank, keepWilds).score < keepScore(hand, rank, keepWilds)
  return helps && rng() >= style.missDiscardChance
}

/** The card to throw. */
export function cpuThrow(state: CrownsState, player: number, level: CpuLevel, rng: RandomFn): string {
  const style = CROWNS_CPU_STYLES[level]
  const rank = wildRank(state)
  const hand = state.hands[player]
  const throwable = hand.filter((card) => canThrow(state, player, card.id))
  if (style.sloppyThrowChance > 0 && rng() < style.sloppyThrowChance) {
    const loose = bestArrangement(hand, rank).loose.filter((card) => canThrow(state, player, card.id) && !isWild(card, rank))
    const pool = loose.length > 0 ? loose : throwable
    return pool[Math.floor(rng() * pool.length)].id
  }
  return bestThrow(hand, throwable, rank, state.out === null).card.id
}

/** Whether to go out throwing `cardId`: always, when it can. */
export function cpuGoesOut(state: CrownsState, player: number, cardId: string): boolean {
  return canGoOut(state, player, cardId)
}

/** The card a CPU goes out with, if any card lets it. */
export function cpuOutCard(state: CrownsState, player: number): string | null {
  return state.hands[player].find((card) => canGoOut(state, player, card.id))?.id ?? null
}
