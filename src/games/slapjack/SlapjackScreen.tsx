import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo } from 'react'

import { SLAPJACK_RULESET } from '@/games/ratslap/engine/types'
import { SlapTable } from '@/games/ratslap/SlapTable'
import { useNextRound } from '@/games/table/useNextRound'
import { useSettings } from '@/hooks/useSettings'

import { SLAPJACK_RULE_KEYS } from './ruleSettings'
import { type SlapjackRoundSettings } from './useSlapjackLoadout'

/** Slapjack's play screen: RatSlap's table under Slapjack's rules (no face-card challenges, a slap on every Jack, and
 * the wrong-slap penalty picked on its setup screen), with seat 2 as the setup screen committed it. */
export function SlapjackScreen() {
  const { settings } = useSettings()
  const { mode, settings: round } = useActiveRound<SlapjackRoundSettings>('slapjack', { slapjackPenalty: settings.slapjackPenalty, slapjackCpu: settings.slapjackCpu })
  const twoPlayer = mode === 'twoPlayer'
  const rules = useMemo(() => ({ ...SLAPJACK_RULESET, penalty: round.slapjackPenalty }), [round.slapjackPenalty])
  const nextRound = useNextRound('slapjack', mode, round, SLAPJACK_RULE_KEYS)
  const nextRules = useCallback(() => ({ ...SLAPJACK_RULESET, penalty: nextRound().slapjackPenalty }), [nextRound])
  return <SlapTable game='slapjack' twoPlayer={twoPlayer} rules={rules} nextRules={nextRules} cpu={twoPlayer ? null : round.slapjackCpu} />
}
