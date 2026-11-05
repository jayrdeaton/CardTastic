import { useActiveRound } from '@tastic/shell'
import { useMemo } from 'react'

import { useSettings } from '@/hooks/useSettings'

import { DEFAULT_RULES, type RatSlapRules } from './engine/types'
import { SlapTable } from './SlapTable'
import { type RatSlapRoundSettings } from './useRatSlapLoadout'

/** RatSlap's play screen: the round the setup screen committed (who sits in seat 2, and the rules); a direct link plays
 * the player's own settings against the CPU. A match runs on the rules it was dealt with. */
export function RatSlapScreen() {
  const { settings } = useSettings()
  const { mode, settings: round } = useActiveRound<RatSlapRoundSettings>('ratslap', { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu })
  const twoPlayer = mode === 'twoPlayer'
  const rules = useMemo<RatSlapRules>(() => ({ ...DEFAULT_RULES, doubles: round.ratslapDoubles, sandwiches: round.ratslapSandwiches, jokers: round.ratslapJokers }), [round.ratslapDoubles, round.ratslapSandwiches, round.ratslapJokers])
  return <SlapTable game='ratslap' twoPlayer={twoPlayer} rules={rules} cpu={twoPlayer ? null : round.ratslapCpu} />
}
