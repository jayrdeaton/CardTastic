import type { GameRuleBuilder } from '@/components/gameRule'

/** Spider's rule in Settings: how many suits the two decks hold. */
export const spiderRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'suits',
    label: 'Suits',
    icon: 'cards-outline',
    value: String(settings.spiderSuits),
    choices: [1, 2, 4].map((n) => ({ value: String(n), label: n === 1 ? '1 Suit' : `${n} Suits` })),
    onChange: (value) => setSettings({ spiderSuits: Number(value) as 1 | 2 | 4 })
  }
]
