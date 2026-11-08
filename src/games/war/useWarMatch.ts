// One War match as it plays out: the state, each player's part of a step, the CPU's (it answers the person's card after a
// moment), and a won battle collected by itself after a beat, so both rows can be seen first. The screen draws the state
// and hears about every change (changed) for its sounds, its moves and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { randomSeed } from '@/engine/rng'

import { canPlay, collectBattle, createWarMatch, playStep } from './engine/rules'
import { type PlayerIndex, type WarDown, type WarLength, type WarState } from './engine/types'

/** A won battle stays on the table this long before it's collected. */
export const BATTLE_COLLECT_MS = 900
/** A war's longer row, longer still. */
export const WAR_COLLECT_MS = 1400
/** The CPU turns its card over this long after the person turns theirs. */
export const CPU_ANSWER_MS = 350

export interface WarMatchOptions {
  length: WarLength
  /** How many cards go face down in a war. */
  down: WarDown
  /** Whether seat 2 is the CPU. War has no decisions, so its CPU has no levels. */
  cpu: boolean
  /** Holds every timer: a dialog is open, the app is in the background, or the result is showing. */
  paused: boolean
  changed: (prev: WarState, next: WarState) => void
  /** For tests: the match's seed and the first deal itself. */
  seed?: () => number
  initialState?: WarState
}

export function useWarMatch({ length, down, cpu, paused, changed, seed = randomSeed, initialState }: WarMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createWarMatch(seed(), length, down))
  const stateRef = useRef(state)
  const latest = useRef({ changed, length, seed })
  useEffect(() => {
    latest.current = { changed, length, seed }
  })

  const apply = useCallback((next: WarState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  const play = useCallback((player: PlayerIndex) => apply(playStep(stateRef.current, player)), [apply])

  const rematch = useCallback((rules?: { length: WarLength; down: WarDown }) => {
    const next = createWarMatch(latest.current.seed(), rules?.length ?? latest.current.length, rules?.down ?? stateRef.current.down)
    stateRef.current = next
    setState(next)
  }, [])

  // A won battle goes to its winner after a beat.
  useEffect(() => {
    if (paused || state.battleWinner === null || state.winner !== null) return
    const seen = state
    const timer = setTimeout(
      () => {
        if (stateRef.current === seen) apply(collectBattle(seen))
      },
      seen.war ? WAR_COLLECT_MS : BATTLE_COLLECT_MS
    )
    return () => clearTimeout(timer)
  }, [state, paused, apply])

  // The CPU answers once the person has played their part of the step.
  useEffect(() => {
    if (paused || !cpu || !state.played[0] || !canPlay(state, 2)) return
    const seen = state
    const timer = setTimeout(() => {
      if (stateRef.current === seen) apply(playStep(seen, 2))
    }, CPU_ANSWER_MS)
    return () => clearTimeout(timer)
  }, [state, paused, cpu, apply])

  return { state, play, rematch }
}
