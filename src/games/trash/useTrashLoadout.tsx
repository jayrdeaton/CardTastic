// Trash's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and how many
// spots each player starts with (the full game, Ace to 10, or a short one, Ace to 5). Both are Settings, so they follow
// the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { LoadoutPills } from '@/games/table/LoadoutPills'
import { useSettings } from '@/hooks/useSettings'
import { type Settings, TRASH_CARDS } from '@/types'

/** The settings a Trash match runs on. */
export type TrashRoundSettings = Pick<Settings, 'trashCards' | 'trashCpu'>

export function useTrashLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: TrashRoundSettings = { trashCards: settings.trashCards, trashCpu: settings.trashCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <LoadoutPills {...props} kind='choice' testID='trash-cards' pills={TRASH_CARDS.map((cards) => ({ key: String(cards), label: `Ace to ${cards}`, on: settings.trashCards === cards, onPress: () => setSettings({ trashCards: cards }) }))} />,
    optionIds: [],
    randomize: () => setSettings({ trashCards: TRASH_CARDS[Math.floor(Math.random() * TRASH_CARDS.length)] }),
    reset: () => setSettings({ trashCards: 10 }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.trashCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ trashCpu: value as CpuLevel }) }
  }
}
