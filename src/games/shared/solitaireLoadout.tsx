import type { GameLoadout, LoadoutOptionsProps } from '@tastic/shell'

import { TodaysDeal } from '@/components/daily/TodaysDeal'
import { GAME_RULE_SETTINGS } from '@/games/ruleSettings'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useSettings } from '@/hooks/useSettings'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import { GAME_TITLES, type SolitaireGameId } from '@/stores/statsTypes'

const noChange = () => {}

/**
 * A solitaire game's setup screen, the shell's one-player loadout (Jay, 2026-11-18: the Daily Deal lives here, with the game's
 * options, as the two-player games' do): the game's name, its rules on a card, and today's Daily Deal. Ready starts or continues the
 * player's regular game.
 */
export function solitaireLoadout(game: SolitaireGameId): () => GameLoadout {
  return function useSolitaireLoadout() {
    const { settings, setSettings } = useSettings()
    const ruleSettings = GAME_RULE_SETTINGS[game]?.rules
    const rules = ruleSettings ? ruleSettings(settings, setSettings) : []
    return {
      roundSettings: {},
      options: (props: LoadoutOptionsProps) => <MatchSetup {...props} game={game} title={GAME_TITLES[game]} rules={rules} extra={<TodaysDeal game={game} />} />,
      placesSeats: true,
      optionIds: [],
      randomize: () => rules.forEach((rule) => rule.onChange(rule.choices[Math.floor(Math.random() * rule.choices.length)].value)),
      reset: () => ruleSettings?.(DEFAULT_SETTINGS, noChange).forEach((rule) => rules.find((current) => current.key === rule.key)?.onChange(rule.value)),
      seatControl: () => undefined
    }
  }
}
