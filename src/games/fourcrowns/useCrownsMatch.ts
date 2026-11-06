// One Four Crowns match as it plays out: the state, the people's moves, and each CPU's on its own timer, one step at a
// time (a draw, then a throw or going out). The screen draws the state and hears about every change (changed) for its
// sounds and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { useSettled } from '@/games/table/useTable'

import { cpuOutCard, cpuStepDelayMs, cpuTakesDiscard, cpuThrow } from './engine/cpu'
import { canTakeDiscard, createCrownsMatch, drawStock, goOut, nextRound, takeDiscard, throwCard, toMove } from './engine/rules'
import { type CrownsState } from './engine/types'

export interface CrownsMatchOptions {
  /** Each player's CPU level, in seat order, or null for a person. */
  cpus: readonly (CpuLevel | null)[]
  /** Holds the CPUs: a dialog is open, the app is in the background. */
  paused: boolean
  /** How long a round's deal takes to land (it grows with the hands): nothing is played meanwhile. */
  dealMs: (state: CrownsState) => number
  changed: (prev: CrownsState, next: CrownsState) => void
  /** For tests: the match's seed, the CPUs' dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: CrownsState
}

export function useCrownsMatch({ cpus, paused, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: CrownsMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createCrownsMatch(seed(), cpus.length))
  // Counts deals (a new round, a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs(state))
  const stateRef = useRef(state)
  const latest = useRef({ changed, cpus, seed, rng })
  useEffect(() => {
    latest.current = { changed, cpus, seed, rng }
  })

  const apply = useCallback((next: CrownsState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  const take = useCallback((player: number) => apply(takeDiscard(stateRef.current, player)), [apply])
  const draw = useCallback((player: number) => apply(drawStock(stateRef.current, player)), [apply])
  const toss = useCallback((player: number, cardId: string) => apply(throwCard(stateRef.current, player, cardId)), [apply])
  const out = useCallback((player: number, cardId: string) => apply(goOut(stateRef.current, player, cardId)), [apply])

  const advance = useCallback(() => {
    if (apply(nextRound(stateRef.current))) setDeal((n) => n + 1)
  }, [apply])

  /** A new match, the last one's highest total playing first. */
  const rematch = useCallback(() => {
    const { totals } = stateRef.current
    const next = createCrownsMatch(latest.current.seed(), totals.length, totals.indexOf(Math.max(...totals)))
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // A CPU takes one step at a time, each after its own pause, on the state it saw: if anything changed meanwhile, it
  // looks again.
  useEffect(() => {
    const mover = toMove(state)
    if (paused || !dealt || mover === null || latest.current.cpus[mover] === null) return
    const seen = state
    const timer = setTimeout(() => {
      const level = latest.current.cpus[mover]
      if (stateRef.current !== seen || !level) return
      const dice = latest.current.rng
      if (seen.phase === 'draw') apply(canTakeDiscard(seen, mover) && cpuTakesDiscard(seen, mover, level, dice) ? takeDiscard(seen, mover) : drawStock(seen, mover))
      else {
        const outCard = cpuOutCard(seen, mover)
        apply(outCard ? goOut(seen, mover, outCard) : throwCard(seen, mover, cpuThrow(seen, mover, level, dice)))
      }
    }, cpuStepDelayMs(latest.current.rng))
    return () => clearTimeout(timer)
  }, [state, paused, dealt, apply])

  return { state, deal, dealt, take, draw, toss, out, nextRound: advance, rematch }
}
