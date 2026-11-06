// One Speed match as it plays out: the state, each player's plays (two people can play at the same moment; the second
// to land is checked against the table as the first left it), the CPU's on its own clock, and the side piles turned by
// themselves after a beat whenever nobody can play. The screen draws the state and hears about every change (changed)
// for its sounds and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { useSettled } from '@/games/table/useTable'

import { cpuMove, cpuPaceMs } from './engine/cpu'
import { createSpeedMatch, isStuck, playCard, turnSides } from './engine/rules'
import { type PlayerIndex, type SpeedState } from './engine/types'

/** With nobody able to play, the side piles are turned after this long: long enough to see that nothing fits. */
export const STUCK_TURN_MS = 1100

export interface SpeedMatchOptions {
  /** The CPU in seat 2, or null for a person. */
  cpu: CpuLevel | null
  /** Holds every timer: a dialog is open, the app is in the background, or the result is showing. */
  paused: boolean
  /** How long the deal takes to land: nothing is played meanwhile. */
  dealMs: number
  changed: (prev: SpeedState, next: SpeedState) => void
  /** For tests: the match's seed, the CPU's dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: SpeedState
}

export function useSpeedMatch({ cpu, paused, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: SpeedMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createSpeedMatch(seed()))
  // Counts deals (a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs)
  const stateRef = useRef(state)
  const latest = useRef({ changed, seed, rng })
  useEffect(() => {
    latest.current = { changed, seed, rng }
  })

  const apply = useCallback((next: SpeedState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  /** The card in a player's slot onto the center pile it fits best, if it fits one now. */
  const play = useCallback((player: PlayerIndex, slot: number) => dealt && apply(playCard(stateRef.current, player, slot)), [dealt, apply])

  const rematch = useCallback(() => {
    const next = createSpeedMatch(latest.current.seed())
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // Nobody can play: the side piles are turned after a beat.
  useEffect(() => {
    if (paused || !dealt || !isStuck(state)) return
    const seen = state
    const timer = setTimeout(() => {
      if (stateRef.current === seen) apply(turnSides(seen))
    }, STUCK_TURN_MS)
    return () => clearTimeout(timer)
  }, [state, paused, dealt, apply])

  // The CPU plays on its own clock: every so often it looks at the table as it is then and plays a card if it has one.
  // The person's plays don't reset its clock, so a quick person can't hold it off. It stops once the match is over, and a
  // new deal starts it again.
  const [cpuTick, setCpuTick] = useState(0)
  useEffect(() => {
    if (paused || !dealt || cpu === null) return
    const timer = setTimeout(
      () => {
        const current = stateRef.current
        if (current.winner !== null) return
        const move = cpuMove(current, 2)
        if (move) apply(playCard(current, 2, move.slot, move.pile))
        setCpuTick((n) => n + 1)
      },
      cpuPaceMs(cpu, latest.current.rng)
    )
    return () => clearTimeout(timer)
  }, [cpuTick, deal, paused, dealt, cpu, apply])

  return { state, deal, dealt, play, rematch }
}
