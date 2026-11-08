import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo } from 'react'

import { useNextRound } from '@/games/table/useNextRound'
import { useSettings } from '@/hooks/useSettings'

import { DEFAULT_RULES, type RatSlapRules } from './engine/types'
import { RATSLAP_RULE_KEYS } from './ruleSettings'
import { SlapTable } from './SlapTable'
import { type RatSlapRoundSettings } from './useRatSlapLoadout'

function ratslapRules(round: Pick<RatSlapRoundSettings, 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers'>): RatSlapRules {
  return { ...DEFAULT_RULES, doubles: round.ratslapDoubles, sandwiches: round.ratslapSandwiches, jokers: round.ratslapJokers }
}

/** RatSlap's play screen: the round the setup screen committed (who sits in seat 2, and the rules); a direct link plays
 * the player's own settings against the CPU. A match runs on the rules it was dealt with. */
export function RatSlapScreen() {
  const { settings } = useSettings()
  const { mode, settings: round } = useActiveRound<RatSlapRoundSettings>('ratslap', { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu })
  const twoPlayer = mode === 'twoPlayer'
  const rules = useMemo(() => ratslapRules(round), [round])
  const nextRound = useNextRound('ratslap', mode, round, RATSLAP_RULE_KEYS)
  const nextRules = useCallback(() => ratslapRules(nextRound()), [nextRound])
  return <SlapTable game='ratslap' twoPlayer={twoPlayer} rules={rules} nextRules={nextRules} cpu={twoPlayer ? null : round.ratslapCpu} />
}
