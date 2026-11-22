import { randomSeed } from '@/engine/rng'
import type { VariantId } from '@/engine/variants'
import { walkWinnable, winnableSeeds } from '@/engine/winnable'
import { store } from '@/redux/store'
import { winnableDealsActions } from '@/redux/winnableDealsSlice'

// Winnable Deals (Settings, on by default; Jay, 2026-11-21): a solitaire game's random deal is only ever one that can be won.
// A deal counts when some line wins it with every card known (face-down cards and the stock's order included), the bar the
// Daily Deals use, so the deals keep real deals' spread of difficulty and Undo takes the guessing out of a face-down card.
//
// The deals are found ahead of time on a Mac and shipped in the app (engine/winnable.ts): a phone (Hermes, no JIT) takes
// about 30 s of CPU for one winnable Canfield deal and over a minute for Forty Thieves, too slow to find the next one while
// a game is played. Each list is walked in this device's own shuffled order (redux/winnableDealsSlice.ts), so no deal comes
// round twice until the whole list has been dealt, then the walk starts over in a new order. A rule set with no list (2- and
// 4-suit Spider, which the solver doesn't cover) deals a plain random deal, as every rule set does with the setting off.

/**
 * The seed for a new regular deal of `variant`: the next winnable deal while `winnable` (the player's Winnable Deals setting)
 * is on and the rule set has a list, else a random one. Never for a Daily Deal, whose seed is the server's (already winnable).
 */
export function dealSeed(variant: VariantId, winnable: boolean): number {
  const seeds = winnable ? winnableSeeds(variant) : []
  if (seeds.length === 0) return randomSeed()
  const { seed, walk } = walkWinnable(seeds, store.getState().winnableDeals?.[variant], randomSeed)
  store.dispatch(winnableDealsActions.dealt({ variant, walk }))
  return seed
}
