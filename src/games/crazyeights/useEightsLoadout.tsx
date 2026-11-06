// Crazy Eights' part of the shell's setup screen (GameDefinition.useLoadout). Seats 1 and 2 are the shell's; under them a
// row of pills: who sits in seats 3 and 4 (games/table/extraSeats.ts), the CPUs' level when seat 2's menu can't set it,
// and the house rules (Jay, 2026-11-06: each a setting): what you do when nothing fits, which cards do something
// besides the 8s, and how many cards each player starts with. All of it is Settings, so it follows the player; the game
// plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { EXTRA_SEAT_RULE_KEYS, extraSeatRules } from '@/games/table/extraSeats'
import { rulePickerIds, RulePickers, type TableRule } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { type EightsDrawRule, type EightsHandRule, type EightsRules, type EightsSpecials } from './engine/types'

/** The settings a Crazy Eights game runs on. */
export type EightsRoundSettings = Pick<Settings, 'eightsCpu' | 'eightsSeat3' | 'eightsSeat4' | 'eightsDraw' | 'eightsSpecials' | 'eightsHand'>

export function eightsRules(settings: EightsRoundSettings): EightsRules {
  return { draw: settings.eightsDraw, specials: settings.eightsSpecials, hand: settings.eightsHand }
}

/** The house rules' pills, each choice saying the rule on its own. */
export function eightsRulePills(settings: EightsRoundSettings, setSettings: (patch: Partial<Settings>) => void): TableRule[] {
  return [
    {
      key: 'draw',
      icon: 'card-plus-outline',
      value: settings.eightsDraw,
      choices: [
        { value: 'untilPlayable', label: 'Keep Drawing' },
        { value: 'one', label: 'Draw One' },
        { value: 'three', label: 'Draw Up to Three' }
      ],
      onChange: (value) => setSettings({ eightsDraw: value as EightsDrawRule })
    },
    {
      key: 'specials',
      icon: 'star-four-points-outline',
      value: settings.eightsSpecials,
      choices: [
        { value: 'eights', label: 'Only 8s' },
        { value: 'twos', label: '2s Draw Two' },
        { value: 'action', label: '2s, Queens, Aces' }
      ],
      onChange: (value) => setSettings({ eightsSpecials: value as EightsSpecials })
    },
    {
      key: 'hand',
      icon: 'cards-outline',
      value: settings.eightsHand,
      choices: [
        { value: 'byPlayers', label: '7 Cards, 5 for 3+' },
        { value: 'seven', label: '7 Cards Each' },
        { value: 'five', label: '5 Cards Each' }
      ],
      onChange: (value) => setSettings({ eightsHand: value as EightsHandRule })
    }
  ]
}

const RULE_KEYS = [...EXTRA_SEAT_RULE_KEYS, 'draw', 'specials', 'hand']

export function useEightsLoadout(mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: EightsRoundSettings = { eightsCpu: settings.eightsCpu, eightsSeat3: settings.eightsSeat3, eightsSeat4: settings.eightsSeat4, eightsDraw: settings.eightsDraw, eightsSpecials: settings.eightsSpecials, eightsHand: settings.eightsHand }
  const rules = [...extraSeatRules({ seat3: settings.eightsSeat3, seat4: settings.eightsSeat4, cpu: settings.eightsCpu, seat2Person: mode === 'twoPlayer', onSeat3: (kind) => setSettings({ eightsSeat3: kind }), onSeat4: (kind) => setSettings({ eightsSeat4: kind }), onCpu: (level) => setSettings({ eightsCpu: level }) }), ...eightsRulePills(roundSettings, setSettings)]
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RulePickers {...props} game='crazyeights' rules={rules} />,
    optionIds: rulePickerIds('crazyeights', RULE_KEYS),
    // The seats are who's playing, so the dice only roll the CPUs' level.
    randomize: () => setSettings({ eightsCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ eightsCpu: 'medium', eightsSeat3: 'off', eightsSeat4: 'off', eightsDraw: 'untilPlayable', eightsSpecials: 'eights', eightsHand: 'byPlayers' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.eightsCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ eightsCpu: value as CpuLevel }) }
  }
}
