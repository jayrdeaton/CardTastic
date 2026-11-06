// Speed's part of the shell's setup screen (GameDefinition.useLoadout): only the CPU's level on seat 2's menu. Its rules
// have nothing to switch (Jay, 2026-11-05: ranks wrap, hands refill by themselves).

import type { GameLoadout, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** The settings a Speed match runs on. */
export type SpeedRoundSettings = Pick<Settings, 'speedCpu'>

export function useSpeedLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SpeedRoundSettings = { speedCpu: settings.speedCpu }
  return {
    roundSettings,
    options: () => null,
    optionIds: [],
    randomize: () => undefined,
    reset: () => undefined,
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.speedCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ speedCpu: value as CpuLevel }) }
  }
}
