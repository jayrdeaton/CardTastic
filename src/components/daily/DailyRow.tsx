import { useAutoPaperTheme } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { useContext } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { CARD_ROW_INSET, CARD_ROW_VERTICAL, InCardContext } from '@/components/cardRows'

interface DailyRowProps {
  icon: string
  label: string
  caption: string
  onPress?: () => void
  disabled?: boolean
  // The badge's look: on (the theme's tertiary), or off
  active?: boolean
  // Checked off: the badge filled in the theme's tertiary, a check in it (today's Daily, won). The on badge one step stronger,
  // so it follows the player's color: auto-paper's success green is a fixed signal color that never does (Jay, 2026-11-23)
  done?: boolean
  // The icon at the end of the row, for a row that goes somewhere
  trailing?: string
  testID?: string
}

/** A row in the shape of the Settings sheet's and the rule cards' (components/RuleRows.tsx): a badge, a label over a caption. In a
 * card (components/cardRows.tsx) it runs to the card's edges, so the whole card is the touch target. */
export function DailyRow({ icon, label, caption, onPress, disabled, active = true, done = false, trailing, testID }: DailyRowProps) {
  const { colors } = useAutoPaperTheme()
  const inCard = useContext(InCardContext)
  return (
    <TouchableRipple onPress={onPress} disabled={disabled || !onPress} style={inCard ? styles.cardRow : styles.row} accessibilityRole='button' accessibilityLabel={`${label}, ${caption}`} accessibilityState={{ disabled: disabled || !onPress }} testID={testID}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: done ? colors.tertiary : active ? colors.tertiaryContainer : colors.surfaceVariant }]} testID={done ? `${testID}-done` : undefined}>
          <Icon source={done ? 'check-bold' : icon} size={18} color={done ? colors.onTertiary : active ? colors.tertiary : colors.onSurfaceVariant} />
        </View>
        <View style={styles.text}>
          <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
            {label}
          </Text>
          <Text variant='bodySmall' numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {caption}
          </Text>
        </View>
        {trailing && <Icon source={trailing} size={24} color={colors.onSurfaceVariant} />}
      </View>
    </TouchableRipple>
  )
}

const styles = StyleSheet.create({
  // The Settings sheet's badge: a rounded square, not a circle
  badge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  cardRow: {
    paddingHorizontal: CARD_ROW_INSET,
    paddingVertical: CARD_ROW_VERTICAL
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  row: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 10
  },
  text: {
    flex: 1
  }
})
