// War's part of the shell's setup screen (GameDefinition.useLoadout): the match's length, Full (until someone has every
// card) or Short (most cards after SHORT_GAME_BATTLES battles), and how many cards go face down in a war (three, or one
// for a quicker war), shown under the game's name (games/table/MatchSetup.tsx) and changed in Settings
// (ruleSettings.ts). They're Settings, so they follow the player. War's CPU has no decisions to make, so seat 2's menu
// offers one plain CPU (no cpuDifficulty).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { warRuleSettings } from './ruleSettings'

/** The settings a War match runs on. */
export type WarRoundSettings = Pick<Settings, 'warLength' | 'warDown'>

export function useWarLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: WarRoundSettings = { warLength: settings.warLength, warDown: settings.warDown }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='war' title={MATCH_GAME_TITLES.war} rules={warRuleSettings(settings, setSettings)} />,
    optionIds: [],
    randomize: () => setSettings({ warLength: Math.random() < 0.5 ? 'full' : 'short' }),
    reset: () => setSettings({ warLength: 'full', warDown: 3 }),
    seatControl: () => undefined
  }
}
