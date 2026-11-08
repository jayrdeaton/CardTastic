import type { GameRuleBuilder } from '@/components/gameRule'

/** TriPeaks' rule in Settings: whether a King and an Ace count as one apart. */
export const tripeaksRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'wrap',
    label: 'Rank Wrap',
    icon: 'autorenew',
    value: settings.tripeaksRankWrap ? 'wrap' : 'nowrap',
    choices: [
      { value: 'nowrap', label: 'No Wrap' },
      { value: 'wrap', label: 'K-A Wrap' }
    ],
    onChange: (value) => setSettings({ tripeaksRankWrap: value === 'wrap' })
  }
]
