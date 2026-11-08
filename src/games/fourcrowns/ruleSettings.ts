import type { GameRuleBuilder } from '@/components/gameRule'

import type { CrownsDeck, CrownsFaces, CrownsLastTurns } from './engine/types'

/** Four Crowns' house rules in Settings (Jay, 2026-11-06: each a setting): the deck, what face cards cost, and whether
 * everyone gets a last turn after someone goes out. */
export const crownsRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'deck',
    label: 'Deck',
    icon: 'cards-outline',
    value: settings.crownsDeck,
    choices: [
      { value: 'plain', label: 'No Jokers' },
      { value: 'jokers', label: 'With 4 Jokers' },
      { value: 'short', label: '3s Up, 4 Jokers' }
    ],
    onChange: (value) => setSettings({ crownsDeck: value as CrownsDeck })
  },
  {
    key: 'faces',
    label: 'Face Cards',
    icon: 'counter',
    value: settings.crownsFaces,
    choices: [
      { value: 'ranked', label: 'J 11, Q 12, K 13' },
      { value: 'ten', label: 'Face Cards 10' }
    ],
    onChange: (value) => setSettings({ crownsFaces: value as CrownsFaces })
  },
  {
    key: 'lastTurns',
    label: 'Going Out',
    icon: 'timer-sand',
    value: settings.crownsLastTurns,
    choices: [
      { value: 'everyone', label: 'Last Turn Each' },
      { value: 'none', label: 'Ends at Once' }
    ],
    onChange: (value) => setSettings({ crownsLastTurns: value as CrownsLastTurns })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const CROWNS_RULE_KEYS = ['crownsDeck', 'crownsFaces', 'crownsLastTurns'] as const
