// Gin Rummy's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and a row
// of pills for the house rules (Jay, 2026-11-06: each a setting): how long a match is (100, 50 or one hand), when a
// player may knock, the bonuses, and how much the table helps with melds. All of it is Settings, so it follows the
// player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers, type TableRule } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { type GinBonusRule, type GinHelp, type GinKnockRule, type GinRules, type GinTarget } from './engine/types'

/** The settings a Gin Rummy match runs on. */
export type GinRoundSettings = Pick<Settings, 'ginTarget' | 'ginKnock' | 'ginBonus' | 'ginHelp' | 'ginCpu'>

export function ginRules(settings: GinRoundSettings): GinRules {
  return { target: settings.ginTarget, knock: settings.ginKnock, bonus: settings.ginBonus }
}

/** The house rules' pills, each choice saying the rule on its own. */
export function ginRulePills(settings: GinRoundSettings, setSettings: (patch: Partial<Settings>) => void): TableRule[] {
  return [
    {
      key: 'target',
      icon: 'flag-checkered',
      value: String(settings.ginTarget),
      choices: [
        { value: '100', label: 'To 100' },
        { value: '50', label: 'To 50' },
        { value: '1', label: 'One Hand' }
      ],
      onChange: (value) => setSettings({ ginTarget: Number(value) as GinTarget })
    },
    {
      key: 'knock',
      icon: 'hand-back-right-outline',
      value: settings.ginKnock,
      choices: [
        { value: 'ten', label: 'Knock at 10' },
        { value: 'oklahoma', label: 'Oklahoma' },
        { value: 'ginOnly', label: 'Gin Only' }
      ],
      onChange: (value) => setSettings({ ginKnock: value as GinKnockRule })
    },
    {
      key: 'bonus',
      icon: 'star-outline',
      value: settings.ginBonus,
      choices: [
        { value: 'standard', label: 'Gin 25, Under 25' },
        { value: 'bigGin', label: 'Plus Big Gin 31' },
        { value: 'hoyle', label: 'Gin 20, Under 10' }
      ],
      onChange: (value) => setSettings({ ginBonus: value as GinBonusRule })
    },
    {
      key: 'help',
      icon: 'lightbulb-outline',
      value: settings.ginHelp,
      choices: [
        { value: 'full', label: 'Melds and Count' },
        { value: 'count', label: 'Count Only' },
        { value: 'none', label: 'No Help' }
      ],
      onChange: (value) => setSettings({ ginHelp: value as GinHelp })
    }
  ]
}

const RULE_KEYS = ['target', 'knock', 'bonus', 'help']

export function useGinLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: GinRoundSettings = { ginTarget: settings.ginTarget, ginKnock: settings.ginKnock, ginBonus: settings.ginBonus, ginHelp: settings.ginHelp, ginCpu: settings.ginCpu }
  const rules = ginRulePills(roundSettings, setSettings)
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RulePickers {...props} game='ginrummy' rules={rules} />,
    optionIds: rulePickerIds('ginrummy', RULE_KEYS),
    // The dice roll the CPU's level; the rules are the table's own to pick.
    randomize: () => setSettings({ ginCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ ginTarget: 100, ginKnock: 'ten', ginBonus: 'standard', ginHelp: 'full' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ginCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ginCpu: value as CpuLevel }) }
  }
}
