// Slapjack's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and what a
// wrong slap costs (Jay, 2026-11-04 picked burning a card, like RatSlap; giving it to the other player is the classic
// rule). Both are Settings, so they follow the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import type { SlapPenalty } from '@/games/ratslap/engine/types'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

/** The settings a Slapjack match runs on. */
export type SlapjackRoundSettings = Pick<Settings, 'slapjackPenalty' | 'slapjackCpu'>

export function useSlapjackLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SlapjackRoundSettings = { slapjackPenalty: settings.slapjackPenalty, slapjackCpu: settings.slapjackCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => (
      <RulePickers
        {...props}
        game='slapjack'
        rules={[
          {
            key: 'penalty',
            icon: 'hand-back-right-outline',
            value: settings.slapjackPenalty,
            choices: [
              { value: 'burn', label: 'Burn a Card' },
              { value: 'give', label: 'Give a Card' }
            ],
            onChange: (value) => setSettings({ slapjackPenalty: value as SlapPenalty })
          }
        ]}
      />
    ),
    optionIds: rulePickerIds('slapjack', ['penalty']),
    randomize: () => undefined,
    reset: () => setSettings({ slapjackPenalty: 'burn' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.slapjackCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ slapjackCpu: value as CpuLevel }) }
  }
}
