import type { GameRuleBuilder } from '@/components/gameRule'

import type { SpeedRefill } from './engine/types'

/** Speed's rules in Settings: whether a King and an Ace follow each other, and whether a hand refills by itself. */
export const speedRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'wrap',
    label: 'Ranks',
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
    label: 'Refill',
    icon: 'card-plus-outline',
    value: settings.speedRefill,
    choices: [
      { value: 'auto', label: 'Auto Refill' },
      { value: 'tap', label: 'Tap to Draw' }
    ],
    onChange: (value) => setSettings({ speedRefill: value as SpeedRefill })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const SPEED_RULE_KEYS = ['speedWrap', 'speedRefill'] as const
