// How a CPU plays Crazy Eights, as pure decisions the screen runs on timers: which card to play (or to draw, or pass),
// and which suit to name with an 8.
//
// Every level draws only when nothing fits (the rules say so). Easy plays a card at random most of the time and names
// a suit at random half the time. Medium keeps its 8s for when nothing else fits, plays the card that leaves it the
// most cards that could follow, and names the suit it holds most of. Hard also plays a 2 or a Queen at a player about
// to go out, and leads and names suits the next player was seen drawing for.

import { type Card, type Suit, SUITS } from '@tastic/cards'

import { type RandomFn } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'

import { canDraw, discardTop, playableCards, seatAfter } from './rules'
import { type EightsState } from './types'

interface CpuStyle {
  /** How often it plays a card at random instead of its best. */
  randomPlayChance: number
  /** How often it names a suit at random. */
  randomSuitChance: number
  /** Whether it keeps its 8s while another card fits. */
  holdEights: boolean
  /** Whether it watches the next player: hits one about to go out, and leads the suits they drew for. */
  watchesNext: boolean
}

export const EIGHTS_CPU_STYLES: Record<CpuLevel, CpuStyle> = {
  easy: { randomPlayChance: 0.6, randomSuitChance: 0.5, holdEights: false, watchesNext: false },
  medium: { randomPlayChance: 0.1, randomSuitChance: 0.1, holdEights: true, watchesNext: false },
  hard: { randomPlayChance: 0, randomSuitChance: 0, holdEights: true, watchesNext: true }
}

/** How long it waits before each step, in ms. */
export const EIGHTS_CPU_STEP_MS: readonly [number, number] = [650, 1000]

export function cpuStepDelayMs(rng: RandomFn): number {
  const [min, max] = EIGHTS_CPU_STEP_MS
  return Math.round(min + (max - min) * rng())
}

export type EightsCpuMove = { kind: 'play'; cardId: string } | { kind: 'draw' } | { kind: 'pass' }

/** The suits the next player looks to be out of: the suit they faced on their last turn, if they drew on it. */
function nextLacks(state: EightsState, player: number): Suit[] {
  const next = seatAfter(state, player, state.direction)
  for (let i = state.turns.length - 1; i >= 0; i--) {
    const turn = state.turns[i]
    if (turn.player !== next) continue
    return turn.drew > 0 && turn.lost === null ? [turn.facing] : []
  }
  return []
}

/** How many cards of each suit in the hand, 8s left out (they go on anything). */
function suitCounts(cards: readonly Card[]): Record<Suit, number> {
  const counts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 }
  for (const card of cards) if (card.rank !== 8) counts[card.suit]++
  return counts
}

/** The best suit to name: the one it holds most of; watching the next player, one they're out of breaks a tie and
 * beats being a card short. */
function bestSuit(cards: readonly Card[], lacks: readonly Suit[]): Suit {
  const counts = suitCounts(cards)
  let best: Suit = SUITS[0]
  let bestScore = -Infinity
  for (const suit of SUITS) {
    const score = counts[suit] * 2 + (lacks.includes(suit) ? 1.5 : 0)
    if (score > bestScore) {
      best = suit
      bestScore = score
    }
  }
  return best
}

/** The CPU's move on its turn: a card to play, or a draw, or a pass. */
export function cpuMove(state: EightsState, player: number, level: CpuLevel, rng: RandomFn): EightsCpuMove {
  const options = playableCards(state, player)
  if (options.length === 0) return canDraw(state, player) ? { kind: 'draw' } : { kind: 'pass' }
  const style = EIGHTS_CPU_STYLES[level]
  if (rng() < style.randomPlayChance) return { kind: 'play', cardId: options[Math.floor(rng() * options.length)].id }

  const hand = state.hands[player]
  const next = seatAfter(state, player, state.direction)
  const nextClose = style.watchesNext && state.hands[next].length <= 2
  const lacks = style.watchesNext ? nextLacks(state, player) : []
  const { specials } = state.rules
  let best: Card = options[0]
  let bestScore = -Infinity
  for (const card of options) {
    const rest = hand.filter((c) => c.id !== card.id)
    let score: number
    if (card.rank === 8) {
      // An 8 picks the suit, so the rest of the hand all follows; but it's the one card that always fits, so it waits.
      score = rest.length - (style.holdEights && rest.length > 0 ? 20 : 0)
    } else {
      // The cards it could play on this one next time round, if the suit held.
      score = rest.filter((c) => c.rank === 8 || c.suit === card.suit || c.rank === card.rank).length
      if (lacks.includes(card.suit)) score += 3
    }
    if (nextClose && ((card.rank === 2 && specials !== 'eights') || (card.rank === 12 && specials === 'action'))) score += 10
    if (score > bestScore) {
      best = card
      bestScore = score
    }
  }
  return { kind: 'play', cardId: best.id }
}

/** The suit to name with an 8. */
export function cpuSuit(state: EightsState, player: number, level: CpuLevel, rng: RandomFn): Suit {
  const style = EIGHTS_CPU_STYLES[level]
  if (rng() < style.randomSuitChance) return SUITS[Math.floor(rng() * SUITS.length)]
  const hand = state.hands[player]
  // With only 8s left, the suit of the 8 underneath is as good as any.
  if (hand.every((card) => card.rank === 8)) return style.watchesNext ? (nextLacks(state, player)[0] ?? discardTop(state).suit) : discardTop(state).suit
  return bestSuit(hand, style.watchesNext ? nextLacks(state, player) : [])
}
