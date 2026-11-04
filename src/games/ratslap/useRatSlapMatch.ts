// One RatSlap match as it plays out: the state, the players' plays and slaps, the CPU's on its own
// timers, and a won pile collected automatically after a beat. The screen draws the state and hears
// about each thing that happens (events) as it happens, for its flights and sounds.

import { type AnyCard } from '@tastic/cards'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type RandomFn, randomSeed } from '@/engine/rng'

import { type CpuLevel, cpuPlayDelayMs, cpuSlapPlan } from './engine/cpu'
import { collectPile, createInitialState, otherPlayer, playCard, slap, toPlay } from './engine/rules'
import { type PlayerIndex, type RatSlapRules, type RatSlapState } from './engine/types'

/** How long a pile won by a face card waits before it's collected: the last card's flight, then a beat
 * in which a double or a sandwich showing can still be slapped away. */
export const CHALLENGE_COLLECT_BEAT_MS = 1100
/** A slapped pile is settled, so it goes sooner. */
export const SLAP_COLLECT_BEAT_MS = 550

export interface MatchEvents {
  played: (player: PlayerIndex, card: AnyCard) => void
  burned: (player: PlayerIndex, card: AnyCard) => void
  wonPile: (player: PlayerIndex, bySlap: boolean) => void
  /** The cards a pile's winner took, bottom to top as they lay (burned cards first). */
  collected: (player: PlayerIndex, cards: AnyCard[]) => void
  matchOver: (winner: PlayerIndex) => void
}

export interface MatchOptions {
  rules: RatSlapRules
  /** The CPU in seat 2, or null for a person. */
  cpu: CpuLevel | null
  /** Holds every timer: a dialog is open, the app is in the background, or the result is showing. */
  paused: boolean
  events: MatchEvents
  /** For tests: the deal's seed, the CPU's dice, and the first deal itself. */
  seed?: () => number
  rng?: RandomFn
  initialState?: RatSlapState
}

/** What a slap did. */
export type SlapOutcome = 'won' | 'burned' | 'lost'

/** Changes whenever the pile shows something new to slap at (or stops being slappable). */
function pileKey(state: RatSlapState): string {
  return `${state.pile.length}|${state.pile[state.pile.length - 1]?.id ?? ''}|${state.pileWinner}|${state.pileWonBySlap}`
}

export function useRatSlapMatch({ rules, cpu, paused, events, seed = randomSeed, rng = Math.random, initialState }: MatchOptions) {
  const [state, setState] = useState(() => initialState ?? createInitialState(seed(), rules, 1))
  const stateRef = useRef(state)
  const latest = useRef({ events, rules, seed, rng })
  useEffect(() => {
    latest.current = { events, rules, seed, rng }
  })

  const commit = useCallback((next: RatSlapState, actor: PlayerIndex) => {
    const prev = stateRef.current
    stateRef.current = next
    setState(next)
    const { events } = latest.current
    if (next.pile.length > prev.pile.length) events.played(actor, next.pile[next.pile.length - 1])
    if (next.burned.length > prev.burned.length) events.burned(actor, next.burned[0])
    if (next.pileWinner !== null && (next.pileWinner !== prev.pileWinner || next.pileWonBySlap !== prev.pileWonBySlap)) events.wonPile(next.pileWinner, next.pileWonBySlap)
    if (prev.pileWinner !== null && next.pileWinner === null && next.pile.length === 0) events.collected(prev.pileWinner, [...prev.burned, ...prev.pile])
    if (next.winner !== null && prev.winner === null) events.matchOver(next.winner)
  }, [])

  /** Plays the player's top card, if it's theirs to play. */
  const play = useCallback(
    (player: PlayerIndex): boolean => {
      const next = playCard(stateRef.current, player)
      if (!next) return false
      commit(next, player)
      return true
    },
    [commit]
  )

  /** A slap, or null when it came too late to count (the pile was already slapped, or the match is over). */
  const slapPile = useCallback(
    (player: PlayerIndex): SlapOutcome | null => {
      const next = slap(stateRef.current, player)
      if (!next) return null
      commit(next, player)
      if (next.winner === otherPlayer(player)) return 'lost'
      return next.pileWinner === player && next.pileWonBySlap ? 'won' : 'burned'
    },
    [commit]
  )

  /** A new deal, the loser of the last match playing first. */
  const rematch = useCallback(() => {
    const { winner } = stateRef.current
    const next = createInitialState(latest.current.seed(), latest.current.rules, winner ? otherPlayer(winner) : 1)
    stateRef.current = next
    setState(next)
  }, [])

  // The CPU looks at each new pile once: if it means to slap, it slaps after its reaction time (and doesn't play over the
  // pile meanwhile); otherwise, on its turn, it plays its card after its own pause. Either waits on the pile staying the
  // same. A pause forgets the look, so the CPU looks again, from scratch, once play goes on.
  const lookRef = useRef<{ key: string; slapAt: number | null }>({ key: '', slapAt: null })
  useEffect(() => {
    if (paused || cpu === null) {
      lookRef.current = { key: '', slapAt: null }
      return
    }
    const key = pileKey(state)
    if (lookRef.current.key !== key) {
      const plan = cpuSlapPlan(state, 2, cpu, latest.current.rng)
      lookRef.current = { key, slapAt: plan ? Date.now() + plan.delayMs : null }
    }
    const { slapAt } = lookRef.current
    if (slapAt !== null) {
      const timer = setTimeout(
        () => {
          lookRef.current = { key, slapAt: null }
          if (pileKey(stateRef.current) === key) slapPile(2)
        },
        Math.max(0, slapAt - Date.now())
      )
      return () => clearTimeout(timer)
    }
    if (toPlay(state) !== 2) return
    const timer = setTimeout(
      () => {
        if (stateRef.current === state) play(2)
      },
      cpuPlayDelayMs(cpu, latest.current.rng)
    )
    return () => clearTimeout(timer)
  }, [state, paused, cpu, play, slapPile])

  // A won pile goes to its winner after a beat.
  useEffect(() => {
    const winner = state.pileWinner
    if (paused || winner === null || state.winner !== null) return
    const timer = setTimeout(
      () => {
        const next = collectPile(stateRef.current, winner)
        if (next) commit(next, winner)
      },
      state.pileWonBySlap ? SLAP_COLLECT_BEAT_MS : CHALLENGE_COLLECT_BEAT_MS
    )
    return () => clearTimeout(timer)
  }, [state, paused, commit])

  return { state, play, slap: slapPile, rematch }
}
