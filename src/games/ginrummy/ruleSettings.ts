import type { GameRuleBuilder } from '@/components/gameRule'

import type { GinBonusRule, GinHelp, GinKnockRule, GinTarget } from './engine/types'

/** Gin Rummy's house rules in Settings (Jay, 2026-11-06: each a setting): how long a match is, when a player may knock,
 * the bonuses, and how much the table helps with melds. */
export const ginRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'target',
    label: 'Match',
    icon: 'flag-checkered',
    value: String(settings.ginTarget),
    choices: [
      { value: '100', label: 'To 100' },
      { value: '50', label: 'To 50' },
      { value: '1', label: 'One Hand' }
    ],
    onChange: (value) => setSettings({ ginTarget: Number(value) as GinTarget })
  },
  {
    key: 'knock',
    label: 'Knocking',
    icon: 'hand-back-right-outline',
    value: settings.ginKnock,
    choices: [
      { value: 'ten', label: 'Knock at 10' },
      { value: 'oklahoma', label: 'Oklahoma' },
      { value: 'ginOnly', label: 'Gin Only' }
    ],
    onChange: (value) => setSettings({ ginKnock: value as GinKnockRule })
  },
  {
    key: 'bonus',
    label: 'Bonuses',
    icon: 'star-outline',
    value: settings.ginBonus,
    choices: [
      { value: 'standard', label: 'Gin 25, Under 25' },
      { value: 'bigGin', label: 'Plus Big Gin 31' },
      { value: 'hoyle', label: 'Gin 20, Under 10' }
    ],
    onChange: (value) => setSettings({ ginBonus: value as GinBonusRule })
  },
  {
    key: 'help',
    label: 'Meld Help',
    icon: 'lightbulb-outline',
    value: settings.ginHelp,
    choices: [
      { value: 'full', label: 'Melds and Count' },
      { value: 'count', label: 'Count Only' },
      { value: 'none', label: 'No Help' }
    ],
    onChange: (value) => setSettings({ ginHelp: value as GinHelp })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const GIN_RULE_KEYS = ['ginTarget', 'ginKnock', 'ginBonus', 'ginHelp'] as const
