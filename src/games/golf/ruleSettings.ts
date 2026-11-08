import type { GameRuleBuilder } from '@/components/gameRule'

/** Golf's rule in Settings: whether a King and an Ace count as one apart. */
export const golfRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'wrap',
    label: 'Rank Wrap',
    icon: 'autorenew',
    value: settings.golfRankWrap ? 'wrap' : 'nowrap',
    choices: [
      { value: 'nowrap', label: 'No Wrap' },
      { value: 'wrap', label: 'K-A Wrap' }
    ],
    onChange: (value) => setSettings({ golfRankWrap: value === 'wrap' })
  }
]
