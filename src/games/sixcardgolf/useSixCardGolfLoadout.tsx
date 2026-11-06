// Six-Card Golf's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and
// how many holes the match plays. Both are Settings, so they follow the player; the match plays on the snapshot taken
// when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import { type Settings, SIX_CARD_GOLF_HOLES } from '@/types'

/** The settings a Six-Card Golf match runs on. */
export type SixCardGolfRoundSettings = Pick<Settings, 'sixCardGolfHoles' | 'sixCardGolfCpu'>

export function useSixCardGolfLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SixCardGolfRoundSettings = { sixCardGolfHoles: settings.sixCardGolfHoles, sixCardGolfCpu: settings.sixCardGolfCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RulePickers {...props} game='sixcardgolf' rules={[{ key: 'holes', icon: 'flag-checkered', value: String(settings.sixCardGolfHoles), choices: SIX_CARD_GOLF_HOLES.map((holes) => ({ value: String(holes), label: holes === 1 ? '1 Hole' : `${holes} Holes` })), onChange: (value) => setSettings({ sixCardGolfHoles: Number(value) as Settings['sixCardGolfHoles'] }) }]} />,
    optionIds: rulePickerIds('sixcardgolf', ['holes']),
    randomize: () => setSettings({ sixCardGolfHoles: SIX_CARD_GOLF_HOLES[Math.floor(Math.random() * SIX_CARD_GOLF_HOLES.length)] }),
    reset: () => setSettings({ sixCardGolfHoles: 9 }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.sixCardGolfCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ sixCardGolfCpu: value as CpuLevel }) }
  }
}
