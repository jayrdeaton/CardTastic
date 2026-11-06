// RatSlap's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// match's three switchable rules, each a pill (games/table/RulePickers.tsx). Both are Settings, so they follow the player like every other rule here; the match
// plays on the snapshot taken when everyone readies up (roundSettings, read back by the play screen).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers, type TableRule } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** The settings a RatSlap match runs on. */
export type RatSlapRoundSettings = Pick<Settings, 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers' | 'ratslapCpu'>

const RULE_SWITCHES: { key: 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers'; icon: string; on: string; off: string }[] = [
  { key: 'ratslapDoubles', icon: 'cards-outline', on: 'Slap Doubles', off: 'No Doubles' },
  { key: 'ratslapSandwiches', icon: 'layers-outline', on: 'Slap Sandwiches', off: 'No Sandwiches' },
  { key: 'ratslapJokers', icon: 'star-four-points-outline', on: 'With Jokers', off: 'No Jokers' }
]

export function useRatSlapLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: RatSlapRoundSettings = { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => (
      <RulePickers
        {...props}
        game='ratslap'
        rules={RULE_SWITCHES.map(({ key, icon, on, off }): TableRule => ({
          key,
          icon,
          value: roundSettings[key] ? 'on' : 'off',
          choices: [
            { value: 'on', label: on },
            { value: 'off', label: off }
          ],
          onChange: (value) => setSettings({ [key]: value === 'on' })
        }))}
      />
    ),
    optionIds: rulePickerIds(
      'ratslap',
      RULE_SWITCHES.map(({ key }) => key)
    ),
    randomize: () => setSettings({ ratslapDoubles: Math.random() < 0.5, ratslapSandwiches: Math.random() < 0.5, ratslapJokers: Math.random() < 0.5 }),
    reset: () => setSettings({ ratslapDoubles: true, ratslapSandwiches: true, ratslapJokers: true }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ratslapCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ratslapCpu: value as CpuLevel }) }
  }
}
