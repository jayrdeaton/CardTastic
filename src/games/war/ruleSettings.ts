import type { GameRuleBuilder } from '@/components/gameRule'

import type { WarDown, WarLength } from './engine/types'

/** War's rules in Settings: how long a game is, and how many cards a war puts face down. */
export const warRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'length',
    label: 'Match',
    icon: 'timer-sand',
    value: settings.warLength,
    choices: [
      { value: 'full', label: 'Full Game' },
      { value: 'short', label: 'Short Game' }
    ],
    onChange: (value) => setSettings({ warLength: value as WarLength })
  },
  {
    key: 'down',
    label: 'War',
    icon: 'cards-outline',
    value: String(settings.warDown),
    choices: [
      { value: '3', label: '3 Down, 1 Up' },
      { value: '1', label: '1 Down, 1 Up' }
    ],
    onChange: (value) => setSettings({ warDown: Number(value) as WarDown })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const WAR_RULE_KEYS = ['warLength', 'warDown'] as const
