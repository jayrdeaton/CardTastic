import { useActiveRound } from '@tastic/shell'
import { useMemo } from 'react'

import { SLAPJACK_RULESET } from '@/games/ratslap/engine/types'
import { SlapTable } from '@/games/ratslap/SlapTable'
import { useSettings } from '@/hooks/useSettings'

import { type SlapjackRoundSettings } from './useSlapjackLoadout'

/** Slapjack's play screen: RatSlap's table under Slapjack's rules (no face-card challenges, a slap on every Jack, and
 * the wrong-slap penalty picked on its setup screen), with seat 2 as the setup screen committed it. */
export function SlapjackScreen() {
  const { settings } = useSettings()
  const { mode, settings: round } = useActiveRound<SlapjackRoundSettings>('slapjack', { slapjackPenalty: settings.slapjackPenalty, slapjackCpu: settings.slapjackCpu })
  const twoPlayer = mode === 'twoPlayer'
  const rules = useMemo(() => ({ ...SLAPJACK_RULESET, penalty: round.slapjackPenalty }), [round.slapjackPenalty])
  return <SlapTable game='slapjack' twoPlayer={twoPlayer} rules={rules} cpu={twoPlayer ? null : round.slapjackCpu} />
}
