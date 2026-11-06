// Four Crowns' part of the shell's setup screen (GameDefinition.useLoadout). Seats 1 and 2 are the shell's; under them a
// row of pills: who sits in seats 3 and 4 (games/table/extraSeats.ts), the CPUs' level when seat 2's menu can't set it,
// and the house rules (Jay, 2026-11-06: each a setting): the deck, what face cards cost, and whether everyone gets a last
// turn after someone goes out. All of it is Settings, so it follows the player; the match plays on the snapshot taken
// when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { EXTRA_SEAT_RULE_KEYS, extraSeatRules } from '@/games/table/extraSeats'
import { rulePickerIds, RulePickers, type TableRule } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { type CrownsDeck, type CrownsFaces, type CrownsLastTurns, type CrownsRules } from './engine/types'

/** The settings a Four Crowns match runs on. */
export type CrownsRoundSettings = Pick<Settings, 'crownsCpu' | 'crownsSeat3' | 'crownsSeat4' | 'crownsDeck' | 'crownsFaces' | 'crownsLastTurns'>

export function crownsRules(settings: CrownsRoundSettings): CrownsRules {
  return { deck: settings.crownsDeck, faces: settings.crownsFaces, lastTurns: settings.crownsLastTurns }
}

/** The house rules' pills, each choice saying the rule on its own. */
export function crownsRulePills(settings: CrownsRoundSettings, setSettings: (patch: Partial<Settings>) => void): TableRule[] {
  return [
    {
      key: 'deck',
      icon: 'cards-outline',
      value: settings.crownsDeck,
      choices: [
        { value: 'plain', label: 'No Jokers' },
        { value: 'jokers', label: 'With 4 Jokers' },
        { value: 'short', label: '3s Up, 4 Jokers' }
      ],
      onChange: (value) => setSettings({ crownsDeck: value as CrownsDeck })
    },
    {
      key: 'faces',
      icon: 'counter',
      value: settings.crownsFaces,
      choices: [
        { value: 'ranked', label: 'J 11, Q 12, K 13' },
        { value: 'ten', label: 'Face Cards 10' }
      ],
      onChange: (value) => setSettings({ crownsFaces: value as CrownsFaces })
    },
    {
      key: 'lastTurns',
      icon: 'timer-sand',
      value: settings.crownsLastTurns,
      choices: [
        { value: 'everyone', label: 'Last Turn Each' },
        { value: 'none', label: 'Ends at Once' }
      ],
      onChange: (value) => setSettings({ crownsLastTurns: value as CrownsLastTurns })
    }
  ]
}

const RULE_KEYS = [...EXTRA_SEAT_RULE_KEYS, 'deck', 'faces', 'lastTurns']

export function useCrownsLoadout(mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: CrownsRoundSettings = { crownsCpu: settings.crownsCpu, crownsSeat3: settings.crownsSeat3, crownsSeat4: settings.crownsSeat4, crownsDeck: settings.crownsDeck, crownsFaces: settings.crownsFaces, crownsLastTurns: settings.crownsLastTurns }
  const rules = [...extraSeatRules({ seat3: settings.crownsSeat3, seat4: settings.crownsSeat4, cpu: settings.crownsCpu, seat2Person: mode === 'twoPlayer', onSeat3: (kind) => setSettings({ crownsSeat3: kind }), onSeat4: (kind) => setSettings({ crownsSeat4: kind }), onCpu: (level) => setSettings({ crownsCpu: level }) }), ...crownsRulePills(roundSettings, setSettings)]
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RulePickers {...props} game='fourcrowns' rules={rules} />,
    optionIds: rulePickerIds('fourcrowns', RULE_KEYS),
    // The seats are who's playing, so the dice only roll the CPUs' level.
    randomize: () => setSettings({ crownsCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ crownsCpu: 'medium', crownsSeat3: 'off', crownsSeat4: 'off', crownsDeck: 'plain', crownsFaces: 'ranked', crownsLastTurns: 'everyone' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.crownsCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ crownsCpu: value as CpuLevel }) }
  }
}
