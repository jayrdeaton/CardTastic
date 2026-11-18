// Four Crowns' part of the shell's setup screen (GameDefinition.useLoadout). Seats 1 and 2 are the shell's; over them the
// game's name and its house rules in effect (games/table/MatchSetup.tsx; the rules are changed in Settings:
// ruleSettings.ts), then pills for who sits in seats 3 and 4 (games/table/extraSeats.ts) and the CPUs' level when seat
// 2's menu can't set it. All of it is Settings, so it follows the player; the match plays on the snapshot taken when
// everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { EXTRA_SEAT_RULE_KEYS, extraSeatRules } from '@/games/table/extraSeats'
import { MatchSetup } from '@/games/table/MatchSetup'
import { rulePickerIds } from '@/games/table/RulePickers'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import type { CrownsRules } from './engine/types'
import { crownsRuleSettings } from './ruleSettings'

/** The settings a Four Crowns match runs on. */
export type CrownsRoundSettings = Pick<Settings, 'crownsCpu' | 'crownsSeat3' | 'crownsSeat4' | 'crownsDeck' | 'crownsFaces' | 'crownsLastTurns'>

export function crownsRules(settings: CrownsRoundSettings): CrownsRules {
  return { deck: settings.crownsDeck, faces: settings.crownsFaces, lastTurns: settings.crownsLastTurns }
}

export function useCrownsLoadout(mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: CrownsRoundSettings = { crownsCpu: settings.crownsCpu, crownsSeat3: settings.crownsSeat3, crownsSeat4: settings.crownsSeat4, crownsDeck: settings.crownsDeck, crownsFaces: settings.crownsFaces, crownsLastTurns: settings.crownsLastTurns }
  const extraSeats = extraSeatRules({ seat3: settings.crownsSeat3, seat4: settings.crownsSeat4, cpu: settings.crownsCpu, seat2Person: mode === 'twoPlayer', onSeat3: (kind) => setSettings({ crownsSeat3: kind }), onSeat4: (kind) => setSettings({ crownsSeat4: kind }), onCpu: (level) => setSettings({ crownsCpu: level }) })
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='fourcrowns' title={MATCH_GAME_TITLES.fourcrowns} rules={crownsRuleSettings(settings, setSettings)} extraSeats={extraSeats} />,
    placesSeats: true,
    optionIds: rulePickerIds('fourcrowns', EXTRA_SEAT_RULE_KEYS),
    // The seats are who's playing, so the dice only roll the CPUs' level.
    randomize: () => setSettings({ crownsCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ crownsCpu: 'medium', crownsSeat3: 'off', crownsSeat4: 'off', crownsDeck: 'plain', crownsFaces: 'ranked', crownsLastTurns: 'everyone' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.crownsCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ crownsCpu: value as CpuLevel }) }
  }
}
