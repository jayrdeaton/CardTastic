import type { GameRuleBuilder } from '@/components/gameRule'

/** Canfield's rule in Settings: draw one card or three. */
export const canfieldRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'draw',
    label: 'Draw',
    icon: 'card-plus-outline',
    value: String(settings.canfieldDraw),
    choices: [
      { value: '1', label: 'Draw 1' },
      { value: '3', label: 'Draw 3' }
    ],
    onChange: (value) => setSettings({ canfieldDraw: Number(value) as 1 | 3 })
  }
]
