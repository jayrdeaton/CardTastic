import { configureStore } from '@reduxjs/toolkit'
import { type Card, controllerFor, replayRun, type VariantId } from '@tastic/cardtastic-engine'

import { GUEST_PLAYER_ID } from '@/constants/player'
import { FOUNDATION_LAYOUT } from '@/engine/foundation'
import type { DealRun } from '@/engine/run'
import gameInProgress, { gameInProgressActions, type SavedGame } from '@/redux/gameInProgressSlice'
import winnableDeals from '@/redux/winnableDealsSlice'
import { SOLITAIRE_GAME_IDS, type SolitaireGameId } from '@/stores/statsTypes'

// Test-only stand-in for '@/redux/store' in game-screen tests: a store holding just the real saved-games
// slice (and where the device is in each list of winnable deals, which a new deal moves on), so the real stores/gameInProgress module (debounce, flush, load, clear) runs against it without
// pulling in the app's whole store and every package its reducers come from. Wire it with
//   jest.mock('@/redux/store', () => require('<relative path>/testUtils/gameInProgressStore').storeModule)
// Lives outside __tests__ because jest runs every file under there as a suite. It has no profileSelection
// slice, so every save here is guest's (GUEST_PLAYER_ID).
const store = configureStore({ reducer: { gameInProgress, winnableDeals }, middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }) })

export const storeModule = { store, persistor: { flush: () => Promise.resolve() } }

/** Drops every game's save. */
export function resetGameInProgress(): void {
  SOLITAIRE_GAME_IDS.forEach((id) => store.dispatch(gameInProgressActions[id].clearAll()))
}

/** Starts a test from `saved` as `gameId`'s only save, JSON round-tripped like a save read back after a
 * relaunch (so an older save shape behaves exactly as it would in the app). Stamped with the current foundation
 * layout, like every save the app makes; pass `foundationLayout: undefined` for a save from before it. */
export function seedGameInProgress(gameId: SolitaireGameId, saved: object): void {
  resetGameInProgress()
  const stamped = { foundationLayout: FOUNDATION_LAYOUT, ...saved }
  store.dispatch(gameInProgressActions[gameId].setSaved({ owner: GUEST_PLAYER_ID, saved: JSON.parse(JSON.stringify(stamped)) as SavedGame<unknown, unknown> }))
}

/** What is currently stored for `gameId` (what a relaunch would resume). */
export function storedGame(gameId: SolitaireGameId): SavedGame<unknown, unknown> | null {
  return store.getState().gameInProgress[gameId][GUEST_PLAYER_ID] ?? null
}

// The rule set a save's deal was dealt under, read from its `config` the way each screen reads it back
const VARIANT_OF: Record<SolitaireGameId, (config?: number) => string> = {
  klondike: (c) => (c === 3 ? 'klondike-draw3' : 'klondike'),
  spider: (c) => (c === 4 ? 'spider-4suit' : c === 2 ? 'spider-2suit' : 'spider'),
  freecell: () => 'freecell',
  pyramid: () => 'pyramid',
  yukon: () => 'yukon',
  golf: (c) => (c === 1 ? 'golf-wrap' : 'golf'),
  tripeaks: (c) => (c === 1 ? 'tripeaks-wrap' : 'tripeaks'),
  canfield: (c) => (c === 1 ? 'canfield-draw1' : 'canfield'),
  scorpion: (c) => (c === 0 ? 'scorpion-classic' : 'scorpion'),
  fortythieves: (c) => (c === 1 ? 'fortythieves-runs' : 'fortythieves'),
  acesup: () => 'acesup'
}

/** The rule set and seed of `gameId`'s saved deal. */
export function savedDeal(gameId: SolitaireGameId): { variant: VariantId; seed: number } {
  const saved = storedGame(gameId)
  if (!saved?.run) throw new Error(`${gameId}'s save has no run`)
  return { variant: VARIANT_OF[gameId](saved.config) as VariantId, seed: saved.run.seed }
}

/** The run `gameId`'s save carries, after checking that replaying it with the rules (@tastic/cardtastic-engine, as Tastic-Server
 * will) lands on exactly the saved board and move count. Throws, naming the action the rules refused, if it doesn't. */
export function expectSavedRunToReplay(gameId: SolitaireGameId): DealRun {
  const saved = storedGame(gameId)
  if (!saved?.run) throw new Error(`${gameId}'s save has no run`)
  const replayed = replayRun(VARIANT_OF[gameId](saved.config), saved.run.seed, saved.run.actions)
  if (!replayed.ok) throw new Error(`${gameId}'s run doesn't replay: ${replayed.error} at action ${replayed.at} of ${JSON.stringify(saved.run.actions)}`)
  if (JSON.stringify(replayed.state) !== JSON.stringify(saved.state)) throw new Error(`${gameId}'s run replays to another board than the one saved`)
  if (replayed.moves !== saved.moves) throw new Error(`${gameId}'s run replays to ${replayed.moves} moves, the save has ${saved.moves}`)
  return saved.run
}

/** The timeout of each screen suite's deal-run test (`the deal run`), the heaviest tests here: each plays some 25 moves, draws
 * and undos through the whole screen over about 49 s of fake time in 10 ms act() steps, 0.2 to 0.8 s on its own and up to
 * 1.7 s in a full run. Nothing in them waits on real time, so they're only ever slow when the worker is starved: with other
 * sessions busy (a load average near 18), FreeCell's ran past Jest's 5 s default in a release build's verify (2026-11-23),
 * and on the efficiency cores (`taskpolicy -b`) FreeCell's took 4.4 to 6.7 s and Spider's 5.1 s. */
export const DEAL_RUN_TIMEOUT_MS = 20_000

// Piles a game keeps as one pile per zone (each move's from index is 0) rather than a list of piles
const SINGLE_PILES = ['stock', 'waste', 'reserve', 'discard']

/** The cards the rules could move on `gameId`'s saved board right now (each legal move's moving card), for a test to tap. */
export function movableCardIds(gameId: SolitaireGameId): string[] {
  const saved = storedGame(gameId)
  if (!saved) return []
  const controller = controllerFor(VARIANT_OF[gameId](saved.config) as VariantId)
  const board = saved.state as Record<string, unknown>
  const ids = controller.legalMoves(saved.state).map(({ from, count }) => {
    // Aces Up keeps its tableau zone's columns as `piles`
    const zone = (board[from.zone] ?? (from.zone === 'tableau' ? board.piles : undefined)) as (Card | Card[] | null)[] | undefined
    if (!Array.isArray(zone)) return undefined
    if (SINGLE_PILES.includes(from.zone)) return (zone as Card[])[zone.length - count]?.id
    const at = zone[from.index]
    return Array.isArray(at) ? at[at.length - count]?.id : (at?.id ?? undefined)
  })
  return [...new Set(ids.filter((id): id is string => !!id))]
}
