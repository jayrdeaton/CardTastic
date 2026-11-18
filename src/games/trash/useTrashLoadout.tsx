// Trash's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, how many spots
// each player starts with (the full game, Ace to 10, or a short one, Ace to 5), and which rank is wild (Jacks or Kings),
// shown under the game's name (games/table/MatchSetup.tsx) and changed in Settings (ruleSettings.ts). All are Settings, so they follow the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import { type Settings, TRASH_CARDS } from '@/types'

import { trashRuleSettings } from './ruleSettings'

/** The settings a Trash match runs on. */
export type TrashRoundSettings = Pick<Settings, 'trashCards' | 'trashWild' | 'trashCpu'>

export function useTrashLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: TrashRoundSettings = { trashCards: settings.trashCards, trashWild: settings.trashWild, trashCpu: settings.trashCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='trash' title={MATCH_GAME_TITLES.trash} rules={trashRuleSettings(settings, setSettings)} />,
    placesSeats: true,
    optionIds: [],
    randomize: () => setSettings({ trashCards: TRASH_CARDS[Math.floor(Math.random() * TRASH_CARDS.length)] }),
    reset: () => setSettings({ trashCards: 10, trashWild: 'jacks' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.trashCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ trashCpu: value as CpuLevel }) }
  }
}
