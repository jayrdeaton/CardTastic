import type { GameRuleBuilder } from '@/components/gameRule'

/** Klondike's rule in Settings: draw one card or three. */
export const klondikeRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'draw',
    label: 'Draw',
    icon: 'card-plus-outline',
    value: String(settings.klondikeDraw),
    choices: [
      { value: '1', label: 'Draw 1' },
      { value: '3', label: 'Draw 3' }
    ],
    onChange: (value) => setSettings({ klondikeDraw: Number(value) as 1 | 3 })
  }
]
