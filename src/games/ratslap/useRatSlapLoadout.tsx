// RatSlap's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// game's name over its three switchable rules in effect (games/table/MatchSetup.tsx; they're changed in Settings:
// ruleSettings.ts). Both are Settings, so they follow the player like every other rule here; the match plays on the
// snapshot taken when everyone readies up (roundSettings, read back by the play screen).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { ratslapRuleSettings } from './ruleSettings'

/** The settings a RatSlap match runs on. */
export type RatSlapRoundSettings = Pick<Settings, 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers' | 'ratslapCpu'>

export function useRatSlapLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: RatSlapRoundSettings = { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='ratslap' title={MATCH_GAME_TITLES.ratslap} rules={ratslapRuleSettings(settings, setSettings)} />,
    optionIds: [],
    randomize: () => setSettings({ ratslapDoubles: Math.random() < 0.5, ratslapSandwiches: Math.random() < 0.5, ratslapJokers: Math.random() < 0.5 }),
    reset: () => setSettings({ ratslapDoubles: true, ratslapSandwiches: true, ratslapJokers: true }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ratslapCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ratslapCpu: value as CpuLevel }) }
  }
}
