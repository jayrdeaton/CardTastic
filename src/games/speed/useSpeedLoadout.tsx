// Speed's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, whether ranks
// wrap, and how a hand refills (Jay, 2026-11-05 picked wrapping and refilling by itself; Ace low only and drawing by
// hand are the choices beside them). All are Settings, so they follow the player; the match plays on the snapshot taken
// when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { SpeedRefill } from './engine/types'

/** The settings a Speed match runs on. */
export type SpeedRoundSettings = Pick<Settings, 'speedWrap' | 'speedRefill' | 'speedCpu'>

export function useSpeedLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SpeedRoundSettings = { speedWrap: settings.speedWrap, speedRefill: settings.speedRefill, speedCpu: settings.speedCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => (
      <RulePickers
        {...props}
        game='speed'
        rules={[
          {
            key: 'wrap',
            icon: 'autorenew',
            value: settings.speedWrap ? 'wrap' : 'low',
            choices: [
              { value: 'wrap', label: 'Ranks Wrap' },
              { value: 'low', label: 'Aces Low Only' }
            ],
            onChange: (value) => setSettings({ speedWrap: value === 'wrap' })
          },
          {
            key: 'refill',
            icon: 'card-plus-outline',
            value: settings.speedRefill,
            choices: [
              { value: 'auto', label: 'Auto Refill' },
              { value: 'tap', label: 'Tap to Draw' }
            ],
            onChange: (value) => setSettings({ speedRefill: value as SpeedRefill })
          }
        ]}
      />
    ),
    optionIds: rulePickerIds('speed', ['wrap', 'refill']),
    randomize: () => undefined,
    reset: () => setSettings({ speedWrap: true, speedRefill: 'auto' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.speedCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ speedCpu: value as CpuLevel }) }
  }
}
