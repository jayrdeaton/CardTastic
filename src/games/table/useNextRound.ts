// A Rematch's rules (Jay, 2026-11-08: a rule changed in the Settings sheet "Applies to next game", and a Rematch starts
// the next game). A match plays on the round its setup screen committed at Ready (@tastic/shell's activeRound), which
// a rule changed mid-match never touches; a Rematch takes the rules from Settings as they are when it's pressed, keeps
// the rest (who's playing, the CPU's level), and commits that as the round, so the screen goes on reading the rules the
// new match plays.

import { liveplayActions, type RoundMode } from '@tastic/shell'
import { useCallback } from 'react'
import { useDispatch } from 'react-redux'

import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** Returns a function that commits the next match's round and hands it back. `ruleKeys` are the game's rule settings
 * (its ruleSettings.ts' *_RULE_KEYS). */
export function useNextRound<S extends Partial<Settings>>(game: string, mode: RoundMode, round: S, ruleKeys: readonly (keyof S & keyof Settings)[]): () => S {
  const { settings } = useSettings()
  const dispatch = useDispatch()
  return useCallback(() => {
    const picked = Object.fromEntries(ruleKeys.map((key) => [key, settings[key]]))
    const next = { ...round, ...picked } as S
    dispatch(liveplayActions.setActiveRound({ game, mode, settings: next }))
    return next
  }, [dispatch, game, mode, round, ruleKeys, settings])
}
