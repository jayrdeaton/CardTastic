// Slapjack's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// game's name over what a wrong slap costs (games/table/MatchSetup.tsx; changed in Settings: ruleSettings.ts). Both are
// Settings, so they follow the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { slapjackRuleSettings } from './ruleSettings'

/** The settings a Slapjack match runs on. */
export type SlapjackRoundSettings = Pick<Settings, 'slapjackPenalty' | 'slapjackCpu'>

export function useSlapjackLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SlapjackRoundSettings = { slapjackPenalty: settings.slapjackPenalty, slapjackCpu: settings.slapjackCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='slapjack' title={MATCH_GAME_TITLES.slapjack} rules={slapjackRuleSettings(settings, setSettings)} />,
    placesSeats: true,
    optionIds: [],
    randomize: () => undefined,
    reset: () => setSettings({ slapjackPenalty: 'burn' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.slapjackCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ slapjackCpu: value as CpuLevel }) }
  }
}
