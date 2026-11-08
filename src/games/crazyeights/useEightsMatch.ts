// One Crazy Eights game as it plays out: the state, the people's moves, and each CPU's on its own timer, one step at a
// time (a card, a draw, a suit). A turn on which nothing fits and nothing more can be drawn passes by itself after a
// beat, whoever's it is, so the card just drawn is seen first. The screen draws the state and hears about every change
// (changed) for its sounds and its result.

import { type Suit } from '@tastic/cards'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { useSettled } from '@/games/table/useTable'

import { cpuMove, cpuStepDelayMs, cpuSuit } from './engine/cpu'
import { canPass, createEightsMatch, draw, nameSuit, pass, play, rematch, toMove } from './engine/rules'
import { type EightsRules, type EightsState } from './engine/types'

/** A turn with nothing to play and nothing to draw passes after this. */
export const NO_PLAY_MS = 900
/** A CPU drawing card after card (until one fits) takes each this soon after the last, not at its thinking pace. */
export const CPU_REDRAW_MS = 380

export interface EightsMatchOptions {
  /** Each player's CPU level, in seat order, or null for a person. */
  cpus: readonly (CpuLevel | null)[]
  rules: EightsRules
  /** Holds every timer: a dialog is open, the app is in the background. */
  paused: boolean
  /** With people passing the phone, who has it: a person's turn passes by itself only once it's theirs (under the pass
   * cover it waits). Null with one person at the table. */
  holder: number | null
  /** How long the deal takes to land: nothing is played meanwhile. */
  dealMs: (state: EightsState) => number
  changed: (prev: EightsState, next: EightsState) => void
  /** For tests: the game's seed, the CPUs' dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: EightsState
}

export function useEightsMatch({ cpus, rules, paused, holder, dealMs, changed, seed = randomSeed, rng = Math.random, initialState }: EightsMatchOptions) {
  const [state, setState] = useState(() => initialState ?? createEightsMatch(seed(), cpus.length, rules))
  // Counts deals (a rematch), so the table deals the cards afresh, and nothing is played until they've landed.
  const [deal, setDeal] = useState(0)
  const dealt = useSettled(deal, dealMs(state))
  const stateRef = useRef(state)
  const latest = useRef({ changed, cpus, seed, rng })
  useEffect(() => {
    latest.current = { changed, cpus, seed, rng }
  })

  const apply = useCallback((next: EightsState | null): boolean => {
    if (!next) return false
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    latest.current.changed(prev, next)
    return true
  }, [])

  const playCard = useCallback((player: number, cardId: string) => apply(play(stateRef.current, player, cardId)), [apply])
  const drawCard = useCallback((player: number) => apply(draw(stateRef.current, player)), [apply])
  const name = useCallback((player: number, suit: Suit) => apply(nameSuit(stateRef.current, player, suit)), [apply])

  /** The next game: the next player first, on `rules` (the last game's if left out). */
  const again = useCallback((rules?: EightsRules) => {
    const next = rematch(stateRef.current, latest.current.seed(), rules)
    stateRef.current = next
    setState(next)
    setDeal((n) => n + 1)
  }, [])

  // One step at a time, each after its own pause, on the state it saw: if anything changed meanwhile, it looks again. A
  // CPU plays, draws, names a suit or passes; a person's turn only ever passes by itself.
  useEffect(() => {
    const mover = toMove(state)
    if (paused || !dealt || mover === null) return
    const level = latest.current.cpus[mover]
    if (level === null && (!canPass(state, mover) || (holder !== null && holder !== mover))) return
    const seen = state
    const timer = setTimeout(
      () => {
        if (stateRef.current !== seen) return
        if (!level) {
          apply(pass(seen, mover))
          return
        }
        const dice = latest.current.rng
        if (seen.phase === 'suit') {
          apply(nameSuit(seen, mover, cpuSuit(seen, mover, level, dice)))
          return
        }
        const move = cpuMove(seen, mover, level, dice)
        apply(move.kind === 'play' ? play(seen, mover, move.cardId) : move.kind === 'draw' ? draw(seen, mover) : pass(seen, mover))
      },
      !level ? NO_PLAY_MS : seen.drawn > 0 && seen.phase === 'play' ? CPU_REDRAW_MS : cpuStepDelayMs(latest.current.rng)
    )
    return () => clearTimeout(timer)
  }, [state, paused, holder, dealt, apply])

  return { state, deal, dealt, play: playCard, draw: drawCard, name, rematch: again }
}
