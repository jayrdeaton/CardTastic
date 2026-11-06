// A table game's rules on the shell's setup screen: one dropdown pill per rule, the same pill as the seat buttons beside
// them (@tastic/profile's OptionPicker on the theme's surface), showing the choice in effect. A game with several rules
// (Crazy Eights, Gin Rummy, Four Crowns) can't give each a row of pills: three rows and the seats run off a phone held
// sideways. Every choice is a Setting, so it follows the player; a match plays on the snapshot taken at Ready.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { getOptionPickerContentSize, OptionPicker, type OptionPickerOption } from '@tastic/profile'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { StyleSheet, View } from 'react-native'

import { useFrameAutoAlign } from '@/components/useFrameAutoAlign'

/** One rule: its menu's choices and the one in effect. Each choice's label says the rule on its own ("Draw One",
 * "Knock at 10"), since the pill shows only the choice, and fits the menu's row: about 140px of the app font at 14
 * (@tastic/profile's menu is 220 wide; "Gin 25, Under 25" is 134, "Draw Until One Fits" 156 is cut off). */
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

/** The rules as a wrapping row of dropdown pills, centered. One parent for every pill, so an open menu stacks over the
 * pills after it. */
export function RulePickers({ game, rules, host, rotation, accentColor, dark }: Pick<LoadoutOptionsProps, 'host' | 'rotation' | 'accentColor' | 'dark'> & { game: string; rules: TableRule[] }) {
  // Against the CPU the setup screen stacks this row over the seat buttons, a later sibling it only lifts for its own
  // menus: an open rule menu lifts the row itself, or the seat buttons draw over the menu.
  const open = host.openId?.startsWith(`${game}-rule-`) ?? false
  return (
    <View style={[styles.row, open && styles.rowOpen]} testID={`${game}-rules`}>
      {rules.map((rule) => (
        <RulePicker key={rule.key} game={game} rule={rule} host={host} rotation={rotation} color={accentColor} dark={dark} />
      ))}
    </View>
  )
}

function RulePicker({ game, rule, host, rotation, color, dark }: { game: string; rule: TableRule; host: LoadoutOptionsProps['host']; rotation: LoadoutOptionsProps['rotation']; color: string; dark: boolean }) {
  const { colors } = useAutoPaperTheme()
  const id = rulePickerId(game, rule.key)
  const size = getOptionPickerContentSize(rule.choices.length)
  // Placed in the setup screen's own turned frame (its two-player halves stay upright however the phone is held).
  const align = useFrameAutoAlign(host.openId === id, size.width, size.height, { rotation })
  return <OptionPicker id={id} host={host} options={rule.choices} value={rule.value} onChange={rule.onChange} color={color} dark={dark} icon={rule.icon} alignOverride={align} triggerStyle={[styles.pill, { backgroundColor: colors.surface }]} />
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rowOpen: { zIndex: 100 }
})
