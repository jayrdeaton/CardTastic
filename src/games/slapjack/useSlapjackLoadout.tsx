// Slapjack's part of the shell's setup screen (GameDefinition.useLoadout): only the CPU's level on seat 2's menu. Its
// rules have nothing to switch.

import type { GameLoadout, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** The settings a Slapjack match runs on. */
export type SlapjackRoundSettings = Pick<Settings, 'slapjackCpu'>

export function useSlapjackLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SlapjackRoundSettings = { slapjackCpu: settings.slapjackCpu }
  return {
    roundSettings,
    options: () => null,
    optionIds: [],
    randomize: () => undefined,
    reset: () => undefined,
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.slapjackCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ slapjackCpu: value as CpuLevel }) }
  }
}
