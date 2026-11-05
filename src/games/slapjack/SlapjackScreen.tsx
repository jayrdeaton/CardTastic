import { useActiveRound } from '@tastic/shell'

import { SLAPJACK_RULESET } from '@/games/ratslap/engine/types'
import { SlapTable } from '@/games/ratslap/SlapTable'
import { useSettings } from '@/hooks/useSettings'

import { type SlapjackRoundSettings } from './useSlapjackLoadout'

/** Slapjack's play screen: RatSlap's table under Slapjack's rules (no face-card challenges, a slap on every Jack), with
 * seat 2 as the setup screen committed it. */
export function SlapjackScreen() {
  const { settings } = useSettings()
  const { mode, settings: round } = useActiveRound<SlapjackRoundSettings>('slapjack', { slapjackCpu: settings.slapjackCpu })
  const twoPlayer = mode === 'twoPlayer'
  return <SlapTable game='slapjack' twoPlayer={twoPlayer} rules={SLAPJACK_RULESET} cpu={twoPlayer ? null : round.slapjackCpu} />
}
