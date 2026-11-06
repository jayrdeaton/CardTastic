// War's part of the shell's setup screen (GameDefinition.useLoadout): the match's length, Full (until someone has every
// card) or Short (most cards after SHORT_GAME_BATTLES battles), and how many cards go face down in a war (three, or one
// for a quicker war). They're Settings, so they follow the player. War's CPU has no decisions to make, so seat 2's menu
// offers one plain CPU (no cpuDifficulty).

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { rulePickerIds, RulePickers } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { WarDown, WarLength } from './engine/types'

/** The settings a War match runs on. */
export type WarRoundSettings = Pick<Settings, 'warLength' | 'warDown'>

const LENGTHS: { value: WarLength; label: string }[] = [
  { value: 'full', label: 'Full Game' },
  { value: 'short', label: 'Short Game' }
]

export function useWarLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: WarRoundSettings = { warLength: settings.warLength, warDown: settings.warDown }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => (
      <RulePickers
        {...props}
        game='war'
        rules={[
          { key: 'length', icon: 'timer-sand', value: settings.warLength, choices: LENGTHS, onChange: (value) => setSettings({ warLength: value as WarLength }) },
          {
            key: 'down',
            icon: 'cards-outline',
            value: String(settings.warDown),
            choices: [
              { value: '3', label: '3 Down, 1 Up' },
              { value: '1', label: '1 Down, 1 Up' }
            ],
            onChange: (value) => setSettings({ warDown: Number(value) as WarDown })
          }
        ]}
      />
    ),
    optionIds: rulePickerIds('war', ['length', 'down']),
    randomize: () => setSettings({ warLength: Math.random() < 0.5 ? 'full' : 'short' }),
    reset: () => setSettings({ warLength: 'full', warDown: 3 }),
    seatControl: () => undefined
  }
}
