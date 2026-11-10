// A game's rules, first in the Settings sheet (Jay, 2026-11-08: every game's rules in Settings; 2026-11-10: at the top of
// it, and on a two-player game's setup screen too, games/table/MatchSetup.tsx). Each rule is a row in the sheet's own
// shape (the badge, the label and the caption of SettingsSections' rows): the rule's name, the choice in effect as its
// caption, and a caret. A tap opens its choices in place under it, a tap on one picks it and closes them. In place rather
// than a popover: the sheet and the setup screen's card scroll and fade at their edges, which would clip a menu hung off a
// row. One rule open at a time.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { type GameRule, ruleChoiceLabel, RULES_APPLY_CAPTION } from '@/components/gameRule'
import { SettingsSection } from '@/components/SettingsSection'

/** A rule row, plus how its badge looks: on (the theme's tertiary, every game rule) or off (Auto Hint while off). */
export type RuleRowSpec = GameRule & { active?: boolean }

export function RuleRows({ rules }: { rules: RuleRowSpec[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return (
    <View style={styles.rows}>
      {rules.map((rule) => (
        <RuleRow key={rule.key} rule={rule} open={openKey === rule.key} onToggle={() => setOpenKey((key) => (key === rule.key ? null : rule.key))} onPicked={() => setOpenKey(null)} />
      ))}
    </View>
  )
}

function RuleRow({ rule, open, onToggle, onPicked }: { rule: RuleRowSpec; open: boolean; onToggle: () => void; onPicked: () => void }) {
  const { colors } = useAutoPaperTheme()
  const active = rule.active ?? true
  const current = ruleChoiceLabel(rule)
  return (
    <View>
      <TouchableRipple onPress={onToggle} style={styles.row} accessibilityRole='button' accessibilityLabel={`${rule.label}, ${current}`} accessibilityState={{ expanded: open }} testID={`rule-${rule.key}`}>
        <View style={styles.rowContent}>
          <View style={[styles.iconBadge, { backgroundColor: active ? colors.tertiaryContainer : colors.surfaceVariant }]}>
            <Icon source={rule.icon} size={18} color={active ? colors.tertiary : colors.onSurfaceVariant} />
          </View>
          <View style={styles.text}>
            <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
              {rule.label}
            </Text>
            <Text variant='bodySmall' numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
              {current}
            </Text>
          </View>
          <Icon source={open ? 'menu-up' : 'menu-down'} size={24} color={colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>
      {open && (
        <View style={styles.choices} accessibilityRole='radiogroup' accessibilityLabel={rule.label}>
          {rule.choices.map((choice) => {
            const checked = choice.value === rule.value
            return (
              <TouchableRipple
                key={choice.value}
                onPress={() => {
                  if (!checked) rule.onChange(choice.value)
                  onPicked()
                }}
                style={styles.choice}
                accessibilityRole='radio'
                accessibilityLabel={choice.label}
                accessibilityState={{ checked }}
                testID={`rule-${rule.key}-${choice.value}`}
              >
                <View style={styles.choiceContent}>
                  <Text variant='bodyLarge' style={[styles.text, { color: colors.onSurface }]}>
                    {choice.label}
                  </Text>
                  {checked && <Icon source='check' size={20} color={colors.tertiary} />}
                </View>
              </TouchableRipple>
            )
          })}
        </View>
      )}
    </View>
  )
}

/** A game's rules as a section of the Settings sheet: the game's name, "Applies to next game", then a row per rule. */
export function GameRulesSection({ title, rules }: { title: string; rules: GameRule[] }) {
  return (
    <SettingsSection label={title.toUpperCase()} caption={RULES_APPLY_CAPTION}>
      <RuleRows rules={rules} />
    </SettingsSection>
  )
}

// The rows match SettingsSections' own (and BaseSettingsDialog's): a 36 badge, 12 to the text, 10 above and below, 4
// between rows.
const BADGE = 36
const BADGE_GAP = 12

const styles = StyleSheet.create({
  choice: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  choiceContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  // Under the row's text, past its badge.
  choices: {
    marginLeft: BADGE + BADGE_GAP - 12
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 10,
    height: BADGE,
    justifyContent: 'center',
    width: BADGE
  },
  row: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 10
  },
  rowContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: BADGE_GAP
  },
  rows: {
    gap: 4
  },
  text: {
    flex: 1,
    flexShrink: 1
  }
})
