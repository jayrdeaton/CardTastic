import type { GameLoadout, LoadoutOptionsProps } from '@tastic/shell'
import { useIsFocused } from 'expo-router'

import { GAME_RULE_SETTINGS } from '@/games/ruleSettings'
import { useSettings } from '@/hooks/useSettings'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import { useGameInProgressSummary, useHasGameInProgress } from '@/stores/gameInProgress'
import type { SolitaireGameId } from '@/stores/statsTypes'

import { SolitaireSetup } from './SolitaireSetup'

const noChange = () => {}

/**
 * A solitaire game's setup screen, the shell's one-player loadout (Jay, 2026-11-18: the Daily Deal lives here, with the game's
 * options, as the two-player games' do): the player, today's Daily Deal, then the random deal's card (SolitaireSetup.tsx). The
 * shell draws no Ready (drawsReady): READY? meant nothing to one person (Jay, 2026-11-21), so the random deal's card starts the game
 * from a row like the Daily's, New Deal, or Continue over the player's game in progress.
 */
export function solitaireLoadout(game: SolitaireGameId): () => GameLoadout {
  return function useSolitaireLoadout() {
    const { settings, setSettings } = useSettings()
    const ruleSettings = GAME_RULE_SETTINGS[game]?.rules
    const rules = ruleSettings ? ruleSettings(settings, setSettings) : []
    const inProgress = useHasGameInProgress(game)
    const progress = useGameInProgressSummary(game, useIsFocused())
    return {
      roundSettings: {},
      options: (props: LoadoutOptionsProps) => <SolitaireSetup {...props} game={game} rules={rules} inProgress={inProgress} progress={progress} />,
      placesSeats: true,
      drawsReady: true,
      optionIds: [],
      randomize: () => rules.forEach((rule) => rule.onChange(rule.choices[Math.floor(Math.random() * rule.choices.length)].value)),
      reset: () => ruleSettings?.(DEFAULT_SETTINGS, noChange).forEach((rule) => rules.find((current) => current.key === rule.key)?.onChange(rule.value)),
      seatControl: () => undefined
    }
  }
}
