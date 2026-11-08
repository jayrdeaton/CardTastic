import type { GameRuleBuilder } from '@/components/gameRule'

/** RatSlap's three switchable rules in Settings, each on or off. */
const SWITCHES: { key: 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers'; label: string; icon: string; on: string; off: string }[] = [
  { key: 'ratslapDoubles', label: 'Doubles', icon: 'cards-outline', on: 'Slap Doubles', off: 'No Doubles' },
  { key: 'ratslapSandwiches', label: 'Sandwiches', icon: 'layers-outline', on: 'Slap Sandwiches', off: 'No Sandwiches' },
  { key: 'ratslapJokers', label: 'Jokers', icon: 'star-four-points-outline', on: 'With Jokers', off: 'No Jokers' }
]

export const ratslapRuleSettings: GameRuleBuilder = (settings, setSettings) =>
  SWITCHES.map(({ key, label, icon, on, off }) => ({
    key,
    label,
    icon,
    value: settings[key] ? 'on' : 'off',
    choices: [
      { value: 'on', label: on },
      { value: 'off', label: off }
    ],
    onChange: (value) => setSettings({ [key]: value === 'on' })
  }))

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const RATSLAP_RULE_KEYS = ['ratslapDoubles', 'ratslapSandwiches', 'ratslapJokers'] as const
