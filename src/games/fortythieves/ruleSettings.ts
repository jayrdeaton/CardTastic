import type { GameRuleBuilder } from '@/components/gameRule'

/** Forty Thieves' rule in Settings: one card at a time, or same-suit runs too. */
export const fortyThievesRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'moves',
    label: 'Moves',
    icon: 'swap-horizontal',
    value: settings.fortyThievesRunMoves ? 'runs' : 'single',
    choices: [
      { value: 'single', label: 'Single Card' },
      { value: 'runs', label: 'Allow Runs' }
    ],
    onChange: (value) => setSettings({ fortyThievesRunMoves: value === 'runs' })
  }
]
