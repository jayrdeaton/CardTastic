import WINNABLE_SEEDS from '@/constants/winnableSeeds.json'
import { mulberry32, shuffle } from '@/engine/rng'
import { canfieldVariant, fortyThievesVariant, golfVariant, klondikeVariant, scorpionVariant, spiderVariant, tripeaksVariant, type VariantId } from '@/engine/variants'
import type { SolitaireGameId } from '@/stores/statsTypes'
import type { Settings } from '@/types'

// The winnable deals Settings' Winnable Deals deals from (Jay, 2026-11-21; stores/winnableDeals.ts deals them): for every rule
// set the solver in @tastic/cardtastic-engine covers, about 1,000 seeds it won with every card known, found ahead of time on
// a Mac (`npm run winnable`, scripts/find-winnable-deals.mjs). Pure, so the Settings sheet can ask about a rule set without
// loading the store.

const LISTS = WINNABLE_SEEDS.seeds as Partial<Record<VariantId, number[]>>

/** The winnable seeds for a rule set: empty for one the solver doesn't cover (2- and 4-suit Spider). */
export function winnableSeeds(variant: VariantId): readonly number[] {
  return LISTS[variant] ?? []
}

/** Whether a rule set has winnable deals to deal from. */
export function hasWinnableDeals(variant: VariantId): boolean {
  return winnableSeeds(variant).length > 0
}

/** The rule set a game's next random deal is dealt under, by the player's settings. */
export function nextDealVariant(game: SolitaireGameId, settings: Settings): VariantId {
  switch (game) {
    case 'klondike':
      return klondikeVariant(settings.klondikeDraw)
    case 'spider':
      return spiderVariant(settings.spiderSuits)
    case 'golf':
      return golfVariant(settings.golfRankWrap)
    case 'tripeaks':
      return tripeaksVariant(settings.tripeaksRankWrap)
    case 'canfield':
      return canfieldVariant(settings.canfieldDraw)
    case 'scorpion':
      return scorpionVariant(settings.scorpionAssistedStock)
    case 'fortythieves':
      return fortyThievesVariant(settings.fortyThievesRunMoves)
    default:
      return game
  }
}

/** Where a device is in a rule set's list: the list walked in the order `order` shuffles it into, `next` deals along. */
export interface WinnableWalk {
  order: number
  next: number
}

// The last order worked out, so a walk doesn't shuffle its list again for every deal
let cachedOrder: { length: number; order: number; indices: number[] } | null = null

function orderOf(length: number, order: number): number[] {
  if (cachedOrder?.length !== length || cachedOrder.order !== order) {
    cachedOrder = { length, order, indices: shuffle([...Array(length).keys()], mulberry32(order)) }
  }
  return cachedOrder.indices
}

/** The seed a walk reaches next in `seeds`, and the walk after it: a new order (from `newOrder`) once the list is used up, or
 * for a device that hasn't walked it yet. */
export function walkWinnable(seeds: readonly number[], walk: WinnableWalk | undefined, newOrder: () => number): { seed: number; walk: WinnableWalk } {
  const current = walk && walk.next >= 0 && walk.next < seeds.length ? walk : { order: newOrder(), next: 0 }
  return { seed: seeds[orderOf(seeds.length, current.order)[current.next]], walk: { order: current.order, next: current.next + 1 } }
}
