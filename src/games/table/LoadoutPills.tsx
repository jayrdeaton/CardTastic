import { Pressable } from '@rific/feedback-press'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

/** One pill on a two-player game's setup screen: a rule switched on or off (RatSlap's slaps), or one choice of several
 * (Golf's holes, Trash's cards). */
export interface LoadoutPill {
  key: string
  label: string
  on: boolean
  onPress: () => void
}

/** A row of pills in the setup screen's match-options slot: on, filled in the loadout's accent; off, an outline. A
 * switch marks off with a cross; a choice marks only the one picked. Drawn inside the loadout's turned frame already, so
 * no turn of its own. */
export function LoadoutPills({ pills, kind, testID, accentColor, onAccentColor, mutedColor }: Pick<LoadoutOptionsProps, 'accentColor' | 'onAccentColor' | 'mutedColor'> & { pills: LoadoutPill[]; kind: 'switch' | 'choice'; testID: string }) {
  return (
    <View style={styles.row} accessibilityRole={kind === 'choice' ? 'radiogroup' : undefined}>
      {pills.map(({ key, label, on, onPress }) => {
        const icon = on ? 'check' : kind === 'switch' ? 'close' : null
        return (
          <Pressable key={key} onPress={onPress} accessibilityRole={kind === 'switch' ? 'switch' : 'radio'} accessibilityState={kind === 'switch' ? { checked: on } : { selected: on }} accessibilityLabel={label} testID={`${testID}-${key}`} style={[styles.pill, on ? { backgroundColor: accentColor, borderColor: accentColor } : { borderColor: mutedColor }]}>
            {icon ? <Icon source={icon} size={16} color={on ? onAccentColor : mutedColor} /> : null}
            <Text variant='labelLarge' style={{ color: on ? onAccentColor : mutedColor }}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', gap: 4, height: 36, paddingHorizontal: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }
})
