// How the CPU in seat 2 plays Gin Rummy, as pure decisions the screen runs on timers: whether to take the discard (or
// the first upcard), which card to throw, and whether to knock.
//
// Every level throws the card that leaves it the least deadwood, and takes a discard that goes straight into a meld.
// Easy often misses a useful discard and often throws a card from its deadwood at random; Medium now and then. Hard
// never does, and also takes a low card that cuts its deadwood a lot, weighs what its deadwood could still become (the
// cards left that would meld two of them), keeps from throwing what the other player looks to be collecting (cards like
// the ones they've taken from the discard), and knocks with less deadwood as the stock runs down, when an undercut gets
// likelier. In simulated matches to 100, Medium beats Easy about 2 in 3 and Hard beats Medium about 3 in 4.

import { type Card, SUITS } from '@tastic/cards'

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { bestArrangement, cardPoints } from './melds'
import { canKnock, canThrow, discardTop, handOf } from './rules'
import { type GinState, KNOCK_LIMIT, type PlayerIndex } from './types'

interface CpuStyle {
  /** How often it draws from the stock when the discard would have gone into a meld. */
  missDiscardChance: number
  /** How often it throws a card from its deadwood at random instead of its best throw. */
  sloppyThrowChance: number
  /** Whether it takes a low card that cuts its deadwood a lot, and keeps from feeding the other player. */
  careful: boolean
}

export const GIN_CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { missDiscardChance: 0.3, sloppyThrowChance: 0.3, careful: false },
  medium: { missDiscardChance: 0.15, sloppyThrowChance: 0.12, careful: false },
  hard: { missDiscardChance: 0, sloppyThrowChance: 0, careful: true }
}

/** How long it waits before each step, in ms. */
export const GIN_CPU_STEP_MS: readonly [number, number] = [650, 1000]

export function cpuStepDelayMs(rng: RandomFn): number {
  const [min, max] = GIN_CPU_STEP_MS
  return Math.round(min + (max - min) * rng())
}

/** The fewest deadwood points a hand of eleven can keep throwing one card (never `keep`). */
function bestAfterThrow(cards: Card[], keep: string | null): { cardId: string; points: number; meldedKeep: boolean } {
  let best = { cardId: cards[0].id, points: Infinity, meldedKeep: false }
  for (const card of cards) {
    if (card.id === keep) continue
    const arrangement = bestArrangement(cards.filter((c) => c.id !== card.id))
    if (arrangement.points < best.points) best = { cardId: card.id, points: arrangement.points, meldedKeep: keep !== null && !arrangement.deadwood.some((c) => c.id === keep) }
  }
  return best
}

/** Whether to take the discard's top card (or the first upcard) rather than draw from the stock (or pass). */
export function cpuTakesDiscard(state: GinState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): boolean {
  const top = discardTop(state)
  if (!top) return false
  const style = GIN_CPU_STYLES[level]
  const hand = handOf(state, player)
  const now = bestArrangement(hand).points
  const after = bestAfterThrow([...hand, top], top.id)
  if (after.meldedKeep) return rng() >= style.missDiscardChance
  return style.careful && cardPoints(top) <= 3 && now - after.points >= 6
}

/** How close the cards are to something the other player has taken from the discard: the same rank, or the same suit
 * a rank or two away. Hard keeps those. */
function feedsOpponent(card: Card, pickups: readonly Card[]): boolean {
  return pickups.some((taken) => taken.rank === card.rank || (taken.suit === card.suit && Math.abs(taken.rank - card.rank) <= 2))
}

/** The card to throw. */
export function cpuThrow(state: GinState, player: PlayerIndex, level: CpuLevel, rng: RandomFn): string {
  const style = GIN_CPU_STYLES[level]
  const hand = handOf(state, player)
  const throwable = hand.filter((card) => canThrow(state, player, card.id))
  if (style.sloppyThrowChance > 0 && rng() < style.sloppyThrowChance) {
    const deadwood = bestArrangement(hand).deadwood.filter((card) => canThrow(state, player, card.id))
    const pool = deadwood.length > 0 ? deadwood : throwable
    return pool[Math.floor(rng() * pool.length)].id
  }
  const pickups = state.pickups[player === 1 ? 1 : 0]
  let best: ThrowOption | null = null
  for (const card of throwable) {
    const kept = hand.filter((c) => c.id !== card.id)
    const arrangement = bestArrangement(kept)
    // Hard weighs what its deadwood could still become: each card it could draw that would meld two of them.
    const points = style.careful ? arrangement.points - OUT_WORTH * outs(arrangement.deadwood, kept, state.discard) : arrangement.points
    const option = { card, points, feeds: style.careful && feedsOpponent(card, pickups) }
    if (!best || throwsBetter(option, best)) best = option
  }
  return best ? best.card.id : throwable[0].id
}

/** What one card that would meld two of Hard's deadwood cards is worth to it, in deadwood points. */
const OUT_WORTH = 2

/** The cards still to be seen (not in hand, not on the discard) that would make a meld with two deadwood cards: the
 * other cards of a pair's rank, the cards either end of two in a row in a suit, and the one between two a rank apart. */
function outs(deadwood: readonly Card[], hand: readonly Card[], discard: readonly Card[]): number {
  const gone = new Set([...hand, ...discard].map((card) => `${card.suit}-${card.rank}`))
  const wanted = new Set<string>()
  for (const a of deadwood)
    for (const b of deadwood) {
      if (a.id >= b.id) continue
      if (a.rank === b.rank) for (const suit of SUITS) wanted.add(`${suit}-${a.rank}`)
      else if (a.suit === b.suit) {
        const low = Math.min(a.rank, b.rank)
        const high = Math.max(a.rank, b.rank)
        if (high - low === 1) {
          wanted.add(`${a.suit}-${low - 1}`)
          wanted.add(`${a.suit}-${high + 1}`)
        } else if (high - low === 2) wanted.add(`${a.suit}-${low + 1}`)
      }
    }
  let count = 0
  for (const key of wanted) {
    const rank = Number(key.split('-')[1])
    if (rank >= 1 && rank <= 13 && !gone.has(key)) count++
  }
  return count
}

interface ThrowOption {
  card: Card
  /** The deadwood left after throwing it. */
  points: number
  /** Whether it looks like what the other player is collecting (Hard only). */
  feeds: boolean
}

/** Fewest points first; but within 3 points, a card that doesn't feed the other player; then the higher card. */
function throwsBetter(option: ThrowOption, best: ThrowOption): boolean {
  if (option.feeds !== best.feeds && Math.abs(option.points - best.points) <= 3) return !option.feeds
  if (option.points !== best.points) return option.points < best.points
  return cardPoints(option.card) > cardPoints(best.card)
}

/** Whether to knock throwing `cardId`: always for gin; once its deadwood is at the knock limit or less, with Hard
 * holding out for less as the stock runs down. */
export function cpuKnocks(state: GinState, player: PlayerIndex, level: CpuLevel, cardId: string): boolean {
  if (!canKnock(state, player, cardId)) return false
  const points = bestArrangement(handOf(state, player).filter((c) => c.id !== cardId)).points
  if (points === 0 || !GIN_CPU_STYLES[level].careful) return true
  const limit = state.stock.length > 18 ? KNOCK_LIMIT : state.stock.length > 10 ? 7 : 4
  return points <= limit
}
