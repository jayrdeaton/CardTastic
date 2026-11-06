// One Gin Rummy match as it plays out: the state, the players' moves, and the CPU's on its own timer, one step at a
// time (a draw, then a throw or a knock). The screen draws the state and hears about every change (changed) for its
// sounds and its result.

import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { otherPlayer } from '@/games/table/players'
import { useSettled } from '@/games/table/useTable'

import { cpuKnocks, cpuStepDelayMs, cpuTakesDiscard, cpuThrow } from './engine/cpu'
import { canTakeDiscard, createGinMatch, drawStock, knock, nextHand, passUpcard, takeDiscard, throwCard, toMove } from './engine/rules'
import { type GinState, type GinTarget, type PlayerIndex } from './engine/types'

export interface GinMatchOptions {
  target: GinTarget
  /** The CPU in seat 2, or null for a person. */
  cpu: CpuLevel | null
  /** Holds the CPU: a dialog is open, the app is in the background. */
  paused: boolean
  /** How long a deal takes to land: nothing is played meanwhile. */
  dealMs: number
  changed: (prev: GinState, next: GinState) => void
  /** For tests: the match's seed, the CPU's dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: GinState
}

export function useGinMatch({ target, cpu, paused, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: GinMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createGinMatch(seed(), target))
  // Counts deals (a new hand, a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs)
  const stateRef = useRef(state)
  const latest = useRef({ changed, target, seed, rng })
  useEffect(() => {
    latest.current = { changed, target, seed, rng }
  })

  const apply = useCallback((next: GinState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  const take = useCallback((player: PlayerIndex) => apply(takeDiscard(stateRef.current, player)), [apply])
  const pass = useCallback((player: PlayerIndex) => apply(passUpcard(stateRef.current, player)), [apply])
  const draw = useCallback((player: PlayerIndex) => apply(drawStock(stateRef.current, player)), [apply])
  const toss = useCallback((player: PlayerIndex, cardId: string) => apply(throwCard(stateRef.current, player, cardId)), [apply])
  const knockWith = useCallback((player: PlayerIndex, cardId: string) => apply(knock(stateRef.current, player, cardId)), [apply])

  const advance = useCallback(() => {
    if (apply(nextHand(stateRef.current))) setDeal((n) => n + 1)
  }, [apply])

  /** A new match, the last one's loser playing first. */
  const rematch = useCallback(() => {
    const { winner } = stateRef.current
    const next = createGinMatch(latest.current.seed(), latest.current.target, winner ? otherPlayer(winner) : 1)
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // The CPU takes one step at a time, each after its own pause, on the state it saw: if anything changed meanwhile, it
  // looks again.
  useEffect(() => {
    if (paused || !dealt || cpu === null || toMove(state) !== 2) return
    const seen = state
    const timer = setTimeout(() => {
      if (stateRef.current !== seen) return
      const dice = latest.current.rng
      if (seen.phase === 'upcard') apply(cpuTakesDiscard(seen, 2, cpu, dice) ? takeDiscard(seen, 2) : passUpcard(seen, 2))
      else if (seen.phase === 'draw') apply(canTakeDiscard(seen, 2) && cpuTakesDiscard(seen, 2, cpu, dice) ? takeDiscard(seen, 2) : drawStock(seen, 2))
      else {
        const cardId = cpuThrow(seen, 2, cpu, dice)
        apply(cpuKnocks(seen, 2, cpu, cardId) ? knock(seen, 2, cardId) : throwCard(seen, 2, cardId))
      }
    }, cpuStepDelayMs(latest.current.rng))
    return () => clearTimeout(timer)
  }, [state, paused, dealt, cpu, apply])

  return { state, deal, dealt, take, pass, draw, toss, knock: knockWith, nextHand: advance, rematch }
}
