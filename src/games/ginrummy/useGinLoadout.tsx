// Gin Rummy's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// score a match plays to (100, or 50 for a shorter game). Both are Settings, so they follow the player; the match plays
// on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { LoadoutPills } from '@/games/table/LoadoutPills'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { GIN_TARGETS } from './engine/types'

/** The settings a Gin Rummy match runs on. */
export type GinRoundSettings = Pick<Settings, 'ginTarget' | 'ginCpu'>

export function useGinLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: GinRoundSettings = { ginTarget: settings.ginTarget, ginCpu: settings.ginCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <LoadoutPills {...props} kind='choice' testID='ginrummy-target' pills={GIN_TARGETS.map((target) => ({ key: String(target), label: `To ${target}`, on: settings.ginTarget === target, onPress: () => setSettings({ ginTarget: target }) }))} />,
    optionIds: [],
    randomize: () => setSettings({ ginTarget: GIN_TARGETS[Math.floor(Math.random() * GIN_TARGETS.length)] }),
    reset: () => setSettings({ ginTarget: 100 }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ginCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ginCpu: value as CpuLevel }) }
  }
}
