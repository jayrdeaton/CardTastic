// A game's rules, first in the Settings sheet (Jay, 2026-11-08: every game's rules in Settings; 2026-11-10: at the top of
// it, and on a setup screen too, games/table/MatchSetup.tsx and games/shared/SolitaireSetup.tsx). They're ONE row that
// opens (Jay, 2026-11-21: "one all encompassing expansion", since rules are seldom changed and most games have one): the
// row says what's in effect, and a tap slides open every rule's choices at once, as chips, a tap on one picking it. It
// stays open, so several can be changed, until the row is tapped again. A game with one rule shows that rule as the row
// (Klondike's Draw · Draw 1); with several the row is Rules, its caption every choice in effect. Each rule used to be a
// row of its own whose choices opened under it one at a time, which read as a stack of half-opened menus. Not a popover
// either: the sheet and the setup screen's cards scroll and fade at their edges, which would clip a menu hung off a row.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { useContext, useEffect, useRef, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { CARD_ROW_INSET, CARD_ROW_VERTICAL, InCardContext } from '@/components/cardRows'
import { type GameRule, ruleChoiceLabel, RULES_APPLY_CAPTION } from '@/components/gameRule'
import { isMotionReduced } from '@/components/reducedMotionFlag'
import { SettingsSection } from '@/components/SettingsSection'

/** A rule, plus how the row's badge looks while it's the only one: on (the theme's tertiary, every game rule) or off (Auto
 * Hint while off). */
export type RuleRowSpec = GameRule & { active?: boolean }

/** How long the choices take to slide open or shut. */
export const RULES_EXPAND_MS = 220

/** The row's caption: the choice in effect, or with several rules each one's, in order. */
export function rulesCaption(rules: Pick<GameRule, 'value' | 'choices'>[]): string {
  return rules.map(ruleChoiceLabel).join(' · ')
}

export function RuleRows({ rules, testID: ownTestID }: { rules: RuleRowSpec[]; testID?: string }) {
  const { colors } = useAutoPaperTheme()
  // In a card (components/cardRows.tsx) the row runs to its edges, so the whole card is the touch target
  const inCard = useContext(InCardContext)
  const [open, setOpen] = useState(false)
  // The choices stay mounted while they slide shut, then go (so nothing hidden can be reached by a screen reader or Tab)
  const [mounted, setMounted] = useState(false)
  const progress = useSharedValue(0)
  const contentHeight = useSharedValue(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  const duration = () => (isMotionReduced() ? 0 : RULES_EXPAND_MS)
  const timing = () => ({ duration: duration(), easing: Easing.out(Easing.cubic) })

  function toggle() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
    if (open) {
      setOpen(false)
      progress.value = withTiming(0, timing())
      closeTimer.current = setTimeout(() => setMounted(false), duration())
    } else {
      setOpen(true)
      setMounted(true)
      // Measured already (opened before): slide straight open. Otherwise the choices' first layout starts it
      if (contentHeight.value > 0) progress.value = withTiming(1, timing())
    }
  }

  // The choices' own height, laid out unconstrained: the box slides between nothing and that
  function measured(event: LayoutChangeEvent) {
    const height = event.nativeEvent.layout.height
    if (height === contentHeight.value) return
    const first = contentHeight.value === 0
    contentHeight.value = height
    if (first && open) progress.value = withTiming(1, timing())
  }

  const bodyStyle = useAnimatedStyle(() => ({ height: progress.value * contentHeight.value, opacity: progress.value }))
  const caretStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 180}deg` }] }))

  if (rules.length === 0) return null
  const single = rules.length === 1 ? rules[0] : null
  const label = single ? single.label : 'Rules'
  const icon = single ? single.icon : 'tune-variant'
  const active = single?.active ?? true
  const caption = rulesCaption(rules)
  // A lone rule's row keeps its rule's id; several are the game's `rules`
  const testID = ownTestID ?? (single ? `rule-${single.key}` : 'rules')

  return (
    <View>
      <TouchableRipple onPress={toggle} style={inCard ? styles.cardRow : styles.row} accessibilityRole='button' accessibilityLabel={`${label}, ${caption}`} accessibilityState={{ expanded: open }} testID={testID}>
        <View style={styles.rowContent}>
          <View style={[styles.iconBadge, { backgroundColor: active ? colors.tertiaryContainer : colors.surfaceVariant }]}>
            <Icon source={icon} size={18} color={active ? colors.tertiary : colors.onSurfaceVariant} />
          </View>
          <View style={styles.text}>
            <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
              {label}
            </Text>
            <Text variant='bodySmall' numberOfLines={2} style={{ color: colors.onSurfaceVariant }}>
              {caption}
            </Text>
          </View>
          <Animated.View style={caretStyle}>
            <Icon source='chevron-down' size={24} color={colors.onSurfaceVariant} />
          </Animated.View>
        </View>
      </TouchableRipple>
      <Animated.View style={[styles.body, bodyStyle]}>
        {mounted && (
          <View style={[styles.choices, inCard && styles.cardChoices]} onLayout={measured} testID={`${testID}-choices`}>
            {rules.map((rule) => (
              <RuleChoices key={rule.key} rule={rule} named={!single} />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  )
}

/** One rule's choices as chips, under its name when the row holds several. */
function RuleChoices({ rule, named }: { rule: RuleRowSpec; named: boolean }) {
  const { colors } = useAutoPaperTheme()
  return (
    <View style={styles.rule}>
      {named && (
        <Text variant='labelMedium' style={{ color: colors.onSurfaceVariant }}>
          {rule.label}
        </Text>
      )}
      <View style={styles.chips} accessibilityRole='radiogroup' accessibilityLabel={rule.label}>
        {rule.choices.map((choice) => {
          const checked = choice.value === rule.value
          return (
            <TouchableRipple
              key={choice.value}
              onPress={() => {
                if (!checked) rule.onChange(choice.value)
              }}
              style={[styles.chip, checked ? { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer } : { borderColor: colors.outline }]}
              accessibilityRole='radio'
              accessibilityLabel={choice.label}
              accessibilityState={{ checked }}
              testID={`rule-${rule.key}-${choice.value}`}
            >
              <View style={styles.chipContent}>
                {checked && <Icon source='check' size={18} color={colors.onSecondaryContainer} />}
                <Text variant='labelLarge' style={{ color: checked ? colors.onSecondaryContainer : colors.onSurface }}>
                  {choice.label}
                </Text>
              </View>
            </TouchableRipple>
          )
        })}
      </View>
    </View>
  )
}

/** A game's rules as a section of the Settings sheet: the game's name, "Applies to next game", then its row. */
export function GameRulesSection({ title, rules }: { title: string; rules: GameRule[] }) {
  return (
    <SettingsSection label={title.toUpperCase()} caption={RULES_APPLY_CAPTION}>
      <RuleRows rules={rules} />
    </SettingsSection>
  )
}

// The row matches SettingsSections' own (and BaseSettingsDialog's): a 36 badge, 12 to the text, 10 above and below.
const BADGE = 36
const BADGE_GAP = 12

const styles = StyleSheet.create({
  // Clips the choices while they slide; they lay out at their own height inside
  body: {
    overflow: 'hidden'
  },
  // In a card, past the row's inset as well
  cardChoices: {
    left: CARD_ROW_INSET + BADGE + BADGE_GAP,
    paddingBottom: CARD_ROW_VERTICAL + 2,
    right: CARD_ROW_INSET
  },
  cardRow: {
    paddingHorizontal: CARD_ROW_INSET,
    paddingVertical: CARD_ROW_VERTICAL
  },
  // MD3's filter chip: 32pt, 8pt corners, outlined until picked, then filled in the secondary container with a check
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  chipContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  // Under the row's text, past its badge, laid out at their own height whatever the box's (absolute)
  choices: {
    gap: 14,
    left: BADGE + BADGE_GAP,
    paddingBottom: 12,
    paddingTop: 2,
    position: 'absolute',
    right: 0,
    top: 0
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
  rule: {
    gap: 8
  },
  text: {
    flex: 1,
    flexShrink: 1
  }
})
