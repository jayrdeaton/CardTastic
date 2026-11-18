// Gin Rummy's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// game's name over its house rules in effect (games/table/MatchSetup.tsx; the rules themselves are changed in Settings:
// ruleSettings.ts). All of it is Settings, so it follows the player; the match plays on the snapshot taken when everyone
// readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { GinRules } from './engine/types'
import { ginRuleSettings } from './ruleSettings'

/** The settings a Gin Rummy match runs on. */
export type GinRoundSettings = Pick<Settings, 'ginTarget' | 'ginKnock' | 'ginBonus' | 'ginHelp' | 'ginCpu'>

export function ginRules(settings: GinRoundSettings): GinRules {
  return { target: settings.ginTarget, knock: settings.ginKnock, bonus: settings.ginBonus }
}

export function useGinLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: GinRoundSettings = { ginTarget: settings.ginTarget, ginKnock: settings.ginKnock, ginBonus: settings.ginBonus, ginHelp: settings.ginHelp, ginCpu: settings.ginCpu }
  const rules = ginRuleSettings(settings, setSettings)
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='ginrummy' title={MATCH_GAME_TITLES.ginrummy} rules={rules} />,
    placesSeats: true,
    optionIds: [],
    // The dice roll the CPU's level; the rules are the table's own to pick.
    randomize: () => setSettings({ ginCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ ginTarget: 100, ginKnock: 'ten', ginBonus: 'standard', ginHelp: 'full' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ginCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ginCpu: value as CpuLevel }) }
  }
}
