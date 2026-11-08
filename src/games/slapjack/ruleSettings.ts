import type { GameRuleBuilder } from '@/components/gameRule'
import type { SlapPenalty } from '@/games/ratslap/engine/types'

/** Slapjack's rule in Settings: what a wrong slap costs (Jay, 2026-11-04 picked burning a card, like RatSlap; giving it
 * to the other player is the classic rule). */
export const slapjackRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'penalty',
    label: 'Wrong Slap',
    icon: 'hand-back-right-outline',
    value: settings.slapjackPenalty,
    choices: [
      { value: 'burn', label: 'Burn a Card' },
      { value: 'give', label: 'Give a Card' }
    ],
    onChange: (value) => setSettings({ slapjackPenalty: value as SlapPenalty })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const SLAPJACK_RULE_KEYS = ['slapjackPenalty'] as const
