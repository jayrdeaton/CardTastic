// War's part of the shell's setup screen (GameDefinition.useLoadout): the match's length, Full (until someone has every
// card) or Short (most cards after SHORT_GAME_BATTLES battles). It's a Setting, so it follows the player. War's CPU has
// no decisions to make, so seat 2's menu offers one plain CPU (no cpuDifficulty).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { WarLength } from './engine/types'

/** The settings a War match runs on. */
export type WarRoundSettings = Pick<Settings, 'warLength'>

const LENGTHS: { value: WarLength; label: string }[] = [
  { value: 'full', label: 'Full Game' },
  { value: 'short', label: 'Short Game' }
]

export function useWarLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: WarRoundSettings = { warLength: settings.warLength }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RulePickers {...props} game='war' rules={[{ key: 'length', icon: 'timer-sand', value: settings.warLength, choices: LENGTHS, onChange: (value) => setSettings({ warLength: value as WarLength }) }]} />,
    optionIds: rulePickerIds('war', ['length']),
    randomize: () => setSettings({ warLength: Math.random() < 0.5 ? 'full' : 'short' }),
    reset: () => setSettings({ warLength: 'full' }),
    seatControl: () => undefined
  }
}
