import type { GameRuleBuilder } from '@/components/gameRule'

import type { EightsDrawRule, EightsHandRule, EightsSpecials } from './engine/types'

/** Crazy Eights' house rules in Settings (Jay, 2026-11-06: each a setting): what you do when nothing fits, which cards
 * do something besides the 8s, and how many cards each player starts with. */
export const eightsRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'draw',
    label: 'When Nothing Fits',
    icon: 'card-plus-outline',
    value: settings.eightsDraw,
    choices: [
      { value: 'untilPlayable', label: 'Keep Drawing' },
      { value: 'one', label: 'Draw One' },
      { value: 'three', label: 'Draw Up to Three' }
    ],
    onChange: (value) => setSettings({ eightsDraw: value as EightsDrawRule })
  },
  {
    key: 'specials',
    label: 'Special Cards',
    icon: 'star-four-points-outline',
    value: settings.eightsSpecials,
    choices: [
      { value: 'eights', label: 'Only 8s' },
      { value: 'twos', label: '2s Draw Two' },
      { value: 'action', label: '2s, Queens, Aces' }
    ],
    onChange: (value) => setSettings({ eightsSpecials: value as EightsSpecials })
  },
  {
    key: 'hand',
    label: 'Hand Size',
    icon: 'cards-outline',
    value: settings.eightsHand,
    choices: [
      { value: 'byPlayers', label: '7 Cards, 5 for 3+' },
      { value: 'seven', label: '7 Cards Each' },
      { value: 'five', label: '5 Cards Each' }
    ],
    onChange: (value) => setSettings({ eightsHand: value as EightsHandRule })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const EIGHTS_RULE_KEYS = ['eightsDraw', 'eightsSpecials', 'eightsHand'] as const
