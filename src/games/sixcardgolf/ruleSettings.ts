import type { GameRuleBuilder } from '@/components/gameRule'
import { type Settings, SIX_CARD_GOLF_HOLES } from '@/types'

/** Six-Card Golf's rule in Settings: how many holes a match is. */
export const sixCardGolfRuleSettings: GameRuleBuilder = (settings, setSettings) => [
  {
    key: 'holes',
    label: 'Match',
    icon: 'flag-checkered',
    value: String(settings.sixCardGolfHoles),
    choices: SIX_CARD_GOLF_HOLES.map((holes) => ({ value: String(holes), label: holes === 1 ? '1 Hole' : `${holes} Holes` })),
    onChange: (value) => setSettings({ sixCardGolfHoles: Number(value) as Settings['sixCardGolfHoles'] })
  }
]

/** The settings those rows write, which a Rematch picks up (games/table/useNextRound.ts). */
export const SIX_CARD_GOLF_RULE_KEYS = ['sixCardGolfHoles'] as const
