// Six-Card Golf's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and
// how many holes the match plays, shown under the game's name (games/table/MatchSetup.tsx) and changed in Settings
// (ruleSettings.ts). Both are Settings, so they follow the player; the match plays on the snapshot taken
// when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import { type Settings, SIX_CARD_GOLF_HOLES } from '@/types'

import { sixCardGolfRuleSettings } from './ruleSettings'

/** The settings a Six-Card Golf match runs on. */
export type SixCardGolfRoundSettings = Pick<Settings, 'sixCardGolfHoles' | 'sixCardGolfCpu'>

export function useSixCardGolfLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SixCardGolfRoundSettings = { sixCardGolfHoles: settings.sixCardGolfHoles, sixCardGolfCpu: settings.sixCardGolfCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='sixcardgolf' title={MATCH_GAME_TITLES.sixcardgolf} rules={sixCardGolfRuleSettings(settings, setSettings)} />,
    placesSeats: true,
    optionIds: [],
    randomize: () => setSettings({ sixCardGolfHoles: SIX_CARD_GOLF_HOLES[Math.floor(Math.random() * SIX_CARD_GOLF_HOLES.length)] }),
    reset: () => setSettings({ sixCardGolfHoles: 9 }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.sixCardGolfCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ sixCardGolfCpu: value as CpuLevel }) }
  }
}
