// One Trash match as it plays out: the state, the players' moves, the CPU's on its own timer, and a card with no spot
// discarded by itself after a beat (so it can be seen first). The screen draws the state and hears about every change
// (changed) for its sounds and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { otherPlayer } from '@/games/table/players'
import { useSettled } from '@/games/table/useTable'

import { cpuDrawChoice, cpuPlaceChoice, cpuStepDelayMs } from './engine/cpu'
import { createTrashMatch, discardHeld, drawStock, heldSpots, nextRound, placeHeld, takeDiscard, toMove } from './engine/rules'
import { type PlayerIndex, type TrashState, type TrashWild } from './engine/types'

/** A card with no spot stays in hand this long before it goes to the discard. */
export const NO_SPOT_MS = 900

export interface TrashMatchOptions {
  spots: number
  /** Which rank is wild. */
  wild: TrashWild
  /** The CPU in seat 2, or null for a person. */
  cpu: CpuLevel | null
  /** Holds every timer: a dialog is open, the app is in the background, or a round's result is showing. */
  paused: boolean
  /** How long a deal takes to land: nothing is played meanwhile. */
  dealMs: number
  changed: (prev: TrashState, next: TrashState) => void
  /** For tests: the match's seed, the CPU's dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: TrashState
}

export function useTrashMatch({ spots, wild, cpu, paused, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: TrashMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createTrashMatch(seed(), spots, 1, wild))
  // Counts deals (a new round, a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs)
  const stateRef = useRef(state)
  const latest = useRef({ changed, spots, seed, rng })
  useEffect(() => {
    latest.current = { changed, spots, seed, rng }
  })

  const apply = useCallback((next: TrashState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  const draw = useCallback((player: PlayerIndex) => apply(drawStock(stateRef.current, player)), [apply])
  const take = useCallback((player: PlayerIndex) => apply(takeDiscard(stateRef.current, player)), [apply])
  const place = useCallback((player: PlayerIndex, index: number) => apply(placeHeld(stateRef.current, player, index)), [apply])

  const advance = useCallback(() => {
    if (apply(nextRound(stateRef.current))) setDeal((n) => n + 1)
  }, [apply])

  /** A new match, the last one's loser playing first. */
  const rematch = useCallback((rules?: { spots: number; wild: TrashWild }) => {
    const { winner } = stateRef.current
    const next = createTrashMatch(latest.current.seed(), rules?.spots ?? latest.current.spots, winner ? otherPlayer(winner) : 1, rules?.wild ?? stateRef.current.wild)
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // A card with no spot goes to the discard by itself, whoever holds it.
  useEffect(() => {
    if (paused || state.phase !== 'place' || !state.held || heldSpots(state).length > 0) return
    const seen = state
    const timer = setTimeout(() => {
      if (stateRef.current === seen) apply(discardHeld(seen, seen.turn))
    }, NO_SPOT_MS)
    return () => clearTimeout(timer)
  }, [state, paused, apply])

  // The CPU takes one step at a time, each after its own pause, on the state it saw: if anything changed meanwhile, it
  // looks again.
  useEffect(() => {
    if (paused || !dealt || cpu === null || toMove(state) !== 2) return
    const seen = state
    let step: (() => TrashState | null) | null = null
    if (seen.phase === 'draw') step = () => (cpuDrawChoice(seen, 2, cpu, latest.current.rng) === 'stock' ? drawStock(seen, 2) : takeDiscard(seen, 2))
    else if (heldSpots(seen).length > 0)
      step = () => {
        const spot = cpuPlaceChoice(seen, cpu, latest.current.rng)
        return spot === null ? null : placeHeld(seen, 2, spot)
      }
    if (!step) return
    const run = step
    const timer = setTimeout(() => {
      if (stateRef.current === seen) apply(run())
    }, cpuStepDelayMs(latest.current.rng))
    return () => clearTimeout(timer)
  }, [state, paused, dealt, cpu, apply])

  return { state, deal, dealt, draw, take, place, nextRound: advance, rematch }
}
