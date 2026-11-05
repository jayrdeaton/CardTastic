// RatSlap's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// match's rules as three switches. Both are Settings, so they follow the player like every other rule here; the match
// plays on the snapshot taken when everyone readies up (roundSettings, read back by the play screen).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { LoadoutPills } from '@/games/table/LoadoutPills'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** The settings a RatSlap match runs on. */
export type RatSlapRoundSettings = Pick<Settings, 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers' | 'ratslapCpu'>

const RULE_SWITCHES: { key: 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers'; label: string }[] = [
  { key: 'ratslapDoubles', label: 'Doubles' },
  { key: 'ratslapSandwiches', label: 'Sandwiches' },
  { key: 'ratslapJokers', label: 'Jokers' }
]

export function useRatSlapLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: RatSlapRoundSettings = { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <LoadoutPills {...props} kind='switch' testID='ratslap-rule' pills={RULE_SWITCHES.map(({ key, label }) => ({ key, label, on: roundSettings[key], onPress: () => setSettings({ [key]: !roundSettings[key] }) }))} />,
    optionIds: [],
    randomize: () => setSettings({ ratslapDoubles: Math.random() < 0.5, ratslapSandwiches: Math.random() < 0.5, ratslapJokers: Math.random() < 0.5 }),
    reset: () => setSettings({ ratslapDoubles: true, ratslapSandwiches: true, ratslapJokers: true }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ratslapCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ratslapCpu: value as CpuLevel }) }
  }
}
