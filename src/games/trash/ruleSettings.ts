import type { GameRuleBuilder } from '@/components/gameRule'
import { type Settings, TRASH_CARDS } from '@/types'

import type { TrashWild } from './engine/types'

/** Trash's rules in Settings: how many spots the first round deals, and which rank is wild. */
export const trashRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'cards',
    label: 'Match',
    icon: 'cards-outline',
    value: String(settings.trashCards),
    choices: TRASH_CARDS.map((cards) => ({ value: String(cards), label: `Ace to ${cards}` })),
    onChange: (value) => setSettings({ trashCards: Number(value) as Settings['trashCards'] })
  },
  {
    key: 'wild',
    label: 'Wild Card',
    icon: 'star-four-points-outline',
    value: settings.trashWild,
    choices: [
      { value: 'jacks', label: 'Jacks Wild' },
      { value: 'kings', label: 'Kings Wild' }
    ],
    onChange: (value) => setSettings({ trashWild: value as TrashWild })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const TRASH_RULE_KEYS = ['trashCards', 'trashWild'] as const
