// One rule a game can be played under (Klondike's draw, Gin Rummy's knocking), as every game's rules are shown: rows
// (components/RuleRows.tsx) at the top of the Settings sheet, and on a two-player game's setup screen too (games/table/
// MatchSetup.tsx; Jay, 2026-11-10: "both places", after two days of Settings alone). Each game builds its own
// from the live settings (its ruleSettings.ts; games/ruleSettings.ts finds them by game id). Pure: no UI, so a rule
// list can be built and tested without loading Paper or the shell.

import type { Settings } from '@/types'

export interface GameRuleChoice<T extends string = string> {
  value: T
  /** Says the rule on its own ("Knock at 10", "Draw 3"): it's the row's caption. */
  label: string
}

export interface GameRule<T extends string = string> {
  key: string
  /** The rule's name, the row's label ("Knocking"). */
  label: string
  /** The row's badge. */
  icon: string
  value: T
  choices: GameRuleChoice<T>[]
  onChange: (value: T) => void
}

/** How a rule list is handed the settings to write. */
export type SetSettings = (patch: Partial<Settings>) => void

/** Builds a game's rules from the live settings. */
export type GameRuleBuilder = (settings: Settings, setSettings: SetSettings) => GameRule[]

/** The label of the choice in effect (the value itself if no choice has it). */
export function ruleChoiceLabel(rule: Pick<GameRule, 'value' | 'choices'>): string {
  return rule.choices.find((choice) => choice.value === rule.value)?.label ?? rule.value
}

/** Under each game's rules in Settings (Jay, 2026-11-08): a rule never changes the deal or match being played. Every
 * solitaire screen reads its rule when it deals, and a two-player match plays on the rules it was readied with, a
 * Rematch on the rules as they are when it's pressed (games/table/useNextRound.ts). */
export const RULES_APPLY_CAPTION = 'Applies to next game'
