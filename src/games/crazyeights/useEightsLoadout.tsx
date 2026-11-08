// Crazy Eights' part of the shell's setup screen (GameDefinition.useLoadout). Seats 1 and 2 are the shell's; over them
// the game's name and its house rules in effect (games/table/MatchSetup.tsx; the rules are changed in Settings:
// ruleSettings.ts), then pills for who sits in seats 3 and 4 (games/table/extraSeats.ts) and the CPUs' level when seat
// 2's menu can't set it. All of it is Settings, so it follows the player; the game plays on the snapshot taken when
// everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { EXTRA_SEAT_RULE_KEYS, extraSeatRules } from '@/games/table/extraSeats'
import { MatchSetup } from '@/games/table/MatchSetup'
import { rulePickerIds } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { EightsRules } from './engine/types'
import { eightsRuleSettings } from './ruleSettings'

/** The settings a Crazy Eights game runs on. */
export type EightsRoundSettings = Pick<Settings, 'eightsCpu' | 'eightsSeat3' | 'eightsSeat4' | 'eightsDraw' | 'eightsSpecials' | 'eightsHand'>

export function eightsRules(settings: EightsRoundSettings): EightsRules {
  return { draw: settings.eightsDraw, specials: settings.eightsSpecials, hand: settings.eightsHand }
}

export function useEightsLoadout(mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: EightsRoundSettings = { eightsCpu: settings.eightsCpu, eightsSeat3: settings.eightsSeat3, eightsSeat4: settings.eightsSeat4, eightsDraw: settings.eightsDraw, eightsSpecials: settings.eightsSpecials, eightsHand: settings.eightsHand }
  const extraSeats = extraSeatRules({ seat3: settings.eightsSeat3, seat4: settings.eightsSeat4, cpu: settings.eightsCpu, seat2Person: mode === 'twoPlayer', onSeat3: (kind) => setSettings({ eightsSeat3: kind }), onSeat4: (kind) => setSettings({ eightsSeat4: kind }), onCpu: (level) => setSettings({ eightsCpu: level }) })
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='crazyeights' title={MATCH_GAME_TITLES.crazyeights} rules={eightsRuleSettings(settings, setSettings)} extraSeats={extraSeats} />,
    optionIds: rulePickerIds('crazyeights', EXTRA_SEAT_RULE_KEYS),
    // The seats are who's playing, so the dice only roll the CPUs' level.
    randomize: () => setSettings({ eightsCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ eightsCpu: 'medium', eightsSeat3: 'off', eightsSeat4: 'off', eightsDraw: 'untilPlayable', eightsSpecials: 'eights', eightsHand: 'byPlayers' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.eightsCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ eightsCpu: value as CpuLevel }) }
  }
}
