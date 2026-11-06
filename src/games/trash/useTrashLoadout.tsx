// Trash's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, how many spots
// each player starts with (the full game, Ace to 10, or a short one, Ace to 5), and which rank is wild (Jacks or Kings).
// All are Settings, so they follow the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import { type Settings, TRASH_CARDS } from '@/types'

import type { TrashWild } from './engine/types'

/** The settings a Trash match runs on. */
export type TrashRoundSettings = Pick<Settings, 'trashCards' | 'trashWild' | 'trashCpu'>

export function useTrashLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: TrashRoundSettings = { trashCards: settings.trashCards, trashWild: settings.trashWild, trashCpu: settings.trashCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => (
      <RulePickers
        {...props}
        game='trash'
        rules={[
          { key: 'cards', icon: 'cards-outline', value: String(settings.trashCards), choices: TRASH_CARDS.map((cards) => ({ value: String(cards), label: `Ace to ${cards}` })), onChange: (value) => setSettings({ trashCards: Number(value) as Settings['trashCards'] }) },
          {
            key: 'wild',
            icon: 'star-four-points-outline',
            value: settings.trashWild,
            choices: [
              { value: 'jacks', label: 'Jacks Wild' },
              { value: 'kings', label: 'Kings Wild' }
            ],
            onChange: (value) => setSettings({ trashWild: value as TrashWild })
          }
        ]}
      />
    ),
    optionIds: rulePickerIds('trash', ['cards', 'wild']),
    randomize: () => setSettings({ trashCards: TRASH_CARDS[Math.floor(Math.random() * TRASH_CARDS.length)] }),
    reset: () => setSettings({ trashCards: 10, trashWild: 'jacks' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.trashCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ trashCpu: value as CpuLevel }) }
  }
}
