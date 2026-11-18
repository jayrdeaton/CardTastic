import { useAutoPaperTheme } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

interface DailyRowProps {
  icon: string
  label: string
  caption: string
  onPress?: () => void
  disabled?: boolean
  // The badge's look: on (the theme's tertiary), or off
  active?: boolean
  // The icon at the end of the row, for a row that goes somewhere
  trailing?: string
  testID?: string
}

/** A row in the shape of the Settings sheet's and the rule cards' (components/RuleRows.tsx): a badge, a label over a caption. */
export function DailyRow({ icon, label, caption, onPress, disabled, active = true, trailing, testID }: DailyRowProps) {
  const { colors } = useAutoPaperTheme()
  return (
    <TouchableRipple onPress={onPress} disabled={disabled || !onPress} style={styles.row} accessibilityRole='button' accessibilityLabel={`${label}, ${caption}`} accessibilityState={{ disabled: disabled || !onPress }} testID={testID}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: active ? colors.tertiaryContainer : colors.surfaceVariant }]}>
          <Icon source={icon} size={18} color={active ? colors.tertiary : colors.onSurfaceVariant} />
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
  badge: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
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
