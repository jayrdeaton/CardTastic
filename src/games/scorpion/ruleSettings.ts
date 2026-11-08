import type { GameRuleBuilder } from '@/components/gameRule'

/** Scorpion's rule in Settings: the assisted deal (three cards held back as a stock to deal once, when the player
 * likes) or the classic one (every card dealt at the start). */
export const scorpionRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'stock',
    label: 'Stock',
    icon: 'layers-outline',
    value: settings.scorpionAssistedStock ? 'assisted' : 'classic',
    choices: [
      { value: 'assisted', label: 'Assisted' },
      { value: 'classic', label: 'Classic' }
    ],
    onChange: (value) => setSettings({ scorpionAssistedStock: value === 'assisted' })
  }
]
