// One Six-Card Golf match as it plays out: the state, the players' moves, and the CPU's on its own timer, one step at a
// time (an opening flip, a draw, a placing) so each can be seen. The screen draws the state and hears about every change
// (changed) for its sounds and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { otherPlayer } from '@/games/table/players'
import { useSettled } from '@/games/table/useTable'

import { cpuDrawChoice, cpuOpeningFlips, cpuPlaceChoice, cpuStepDelayMs } from './engine/cpu'
import { createGolfMatch, discardHeld, drawStock, flipOpening, matchWinner, nextHole, swapInto, takeDiscard, toMove } from './engine/rules'
import { type GolfState, type PlayerIndex } from './engine/types'

export interface GolfMatchOptions {
  holes: number
  /** The CPU in seat 2, or null for a person. */
  cpu: CpuLevel | null
  /** Holds the CPU: a dialog is open, the app is in the background, or a hole's scores are showing. */
  paused: boolean
  /** How long a deal takes to land: nothing is played meanwhile. */
  dealMs: number
  changed: (prev: GolfState, next: GolfState) => void
  /** For tests: the match's seed, the CPU's dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: GolfState
}

export function useGolfMatch({ holes, cpu, paused, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: GolfMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createGolfMatch(seed(), holes, 1))
  // Counts deals (a new hole, a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs)
  const stateRef = useRef(state)
  const latest = useRef({ changed, holes, seed, rng })
  useEffect(() => {
    latest.current = { changed, holes, seed, rng }
  })

  const commit = useCallback((next: GolfState) => {
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
  }, [])

  const apply = useCallback(
    (next: GolfState | null): boolean => {
      if (!next) return false
      commit(next)
      return true
    },
    [commit]
  )

  const flip = useCallback((player: PlayerIndex, index: number) => apply(flipOpening(stateRef.current, player, index)), [apply])
  const draw = useCallback((player: PlayerIndex) => apply(drawStock(stateRef.current, player)), [apply])
  const take = useCallback((player: PlayerIndex) => apply(takeDiscard(stateRef.current, player)), [apply])
  const swap = useCallback((player: PlayerIndex, index: number) => apply(swapInto(stateRef.current, player, index)), [apply])
  const discard = useCallback((player: PlayerIndex) => apply(discardHeld(stateRef.current, player)), [apply])

  const advance = useCallback(() => {
    if (apply(nextHole(stateRef.current))) setDeal((n) => n + 1)
  }, [apply])

  /** A new match: the last one's loser plays first (after a tie, whoever didn't start the last hole). */
  const rematch = useCallback((holes?: number) => {
    const last = stateRef.current
    const winner = matchWinner(last)
    const next = createGolfMatch(latest.current.seed(), holes ?? latest.current.holes, winner ? otherPlayer(winner) : otherPlayer(last.starter))
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // The CPU's opening flips, picked together at the hole's start so they land in different columns.
  const flipPlan = useRef<number[]>([])

  // The CPU takes one step at a time, each after its own pause, on the state it saw: if anything changed meanwhile, it
  // looks again.
  useEffect(() => {
    if (paused || !dealt || cpu === null) return
    const seen = state
    let step: (() => GolfState | null) | null = null
    if (seen.phase === 'flip' && seen.toFlip[1] > 0) {
      step = () => {
        const { rng } = latest.current
        if (seen.toFlip[1] === 2 || flipPlan.current.length === 0) flipPlan.current = cpuOpeningFlips(seen, 2, rng)
        const index = flipPlan.current.shift()!
        return flipOpening(seen, 2, index)
      }
    } else if (toMove(seen) === 2 && seen.phase === 'draw') {
      step = () => (cpuDrawChoice(seen, 2, cpu, latest.current.rng) === 'stock' ? drawStock(seen, 2) : takeDiscard(seen, 2))
    } else if (toMove(seen) === 2 && seen.phase === 'place') {
      step = () => {
        const choice = cpuPlaceChoice(seen, 2, cpu, latest.current.rng)
        return choice === 'discard' ? discardHeld(seen, 2) : swapInto(seen, 2, choice)
      }
    }
    if (!step) return
    const run = step
    const timer = setTimeout(() => {
      if (stateRef.current === seen) apply(run())
    }, cpuStepDelayMs(latest.current.rng))
    return () => clearTimeout(timer)
  }, [state, paused, dealt, cpu, apply])

  return { state, deal, dealt, flip, draw, take, swap, discard, nextHole: advance, rematch }
}
