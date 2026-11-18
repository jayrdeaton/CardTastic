// Speed's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, whether ranks
// wrap, and how a hand refills (Jay, 2026-11-05 picked wrapping and refilling by itself; Ace low only and drawing by
// hand are the choices beside them), shown under the game's name (games/table/MatchSetup.tsx) and changed in Settings
// (ruleSettings.ts). All are Settings, so they follow the player; the match plays on the snapshot taken
// when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'

import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { speedRuleSettings } from './ruleSettings'

/** The settings a Speed match runs on. */
export type SpeedRoundSettings = Pick<Settings, 'speedWrap' | 'speedRefill' | 'speedCpu'>

export function useSpeedLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: SpeedRoundSettings = { speedWrap: settings.speedWrap, speedRefill: settings.speedRefill, speedCpu: settings.speedCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game='speed' title={MATCH_GAME_TITLES.speed} rules={speedRuleSettings(settings, setSettings)} />,
    placesSeats: true,
    optionIds: [],
    randomize: () => undefined,
    reset: () => setSettings({ speedWrap: true, speedRefill: 'auto' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.speedCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ speedCpu: value as CpuLevel }) }
  }
}
