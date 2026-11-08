// Seats 3 and 4 on a table game's setup screen (Four Crowns, Crazy Eights: games/table/extraSeats.ts), and the CPUs'
// level when seat 2's menu can't set it: one dropdown pill each, the same pill as the seat buttons beside them
// (@tastic/profile's OptionPicker on the theme's surface), showing the choice in effect. They're who's playing; a game's
// rules are in Settings (components/RuleRows.tsx, Jay, 2026-11-08), summed up on the setup screen by MatchSetup.tsx.
// Every choice is a Setting, so it follows the player; a match plays on the snapshot taken at Ready.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { getOptionPickerContentSize, OptionPicker, type OptionPickerOption } from '@tastic/profile'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { StyleSheet, View } from 'react-native'

import { useFrameAutoAlign } from '@/components/useFrameAutoAlign'

/** One pill: its menu's choices and the one in effect. Each choice's label says it on its own ("Player 3: CPU"), since
 * the pill shows only the choice, and fits the menu's row: about 140px of the app font at 14 (@tastic/profile's menu
 * is 220 wide). */
export interface TableRule<T extends string = string> {
  key: string
  /** The pill's chip: what kind of rule it is. */
  icon: string
  value: T
  choices: OptionPickerOption<T>[]
  onChange: (value: T) => void
}

/** The popover id of a rule's menu, for the loadout's `optionIds`. */
export function rulePickerId(game: string, key: string): string {
  return `${game}-rule-${key}`
}

/** Every popover id a game's rules can open (the loadout elevates its options row while one is open). */
export function rulePickerIds(game: string, keys: readonly string[]): string[] {
  return keys.map((key) => rulePickerId(game, key))
}

/** The pills as a wrapping row, centered. One parent for every pill, so an open menu stacks over the
 * pills after it. */
export function RulePickers({ game, rules, host, accentColor, dark }: Pick<LoadoutOptionsProps, 'host' | 'accentColor' | 'dark'> & { game: string; rules: TableRule[] }) {
  // Against the CPU the setup screen stacks this row over the seat buttons, a later sibling it only lifts for its own
  // menus: an open rule menu lifts the row itself, or the seat buttons draw over the menu.
  const open = host.openId?.startsWith(`${game}-rule-`) ?? false
  return (
    <View style={[styles.row, open && styles.rowOpen]} testID={`${game}-rules`}>
      {rules.map((rule) => (
        <RulePicker key={rule.key} game={game} rule={rule} host={host} color={accentColor} dark={dark} />
      ))}
    </View>
  )
}

function RulePicker({ game, rule, host, color, dark }: { game: string; rule: TableRule; host: LoadoutOptionsProps['host']; color: string; dark: boolean }) {
  const { colors } = useAutoPaperTheme()
  const id = rulePickerId(game, rule.key)
  const size = getOptionPickerContentSize(rule.choices.length)
  const align = useFrameAutoAlign(host.openId === id, size.width, size.height)
  return <OptionPicker id={id} host={host} options={rule.choices} value={rule.value} onChange={rule.onChange} color={color} dark={dark} icon={rule.icon} alignOverride={align} triggerStyle={[styles.pill, { backgroundColor: colors.surface }]} />
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rowOpen: { zIndex: 100 }
})
