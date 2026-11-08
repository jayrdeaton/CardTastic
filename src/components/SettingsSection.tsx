import { useAutoPaperTheme } from '@rific/auto-paper'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

interface SettingsSectionProps {
  // Omit when the section's own content is self-explanatory without one (e.g. a labeled row of
  // card previews) - not every group needs a caption repeating what's already legible below it.
  label?: string
  // A line under the label, about the whole section (a game's rules: "Applies to next game").
  caption?: string
  children: ReactNode
}

// Renders inside BaseSettingsDialog's own MD3 card (see SettingsSections.tsx), so this uses
// useAutoPaperTheme's colors.* tokens - the same ones that dialog's own built-in rows use - rather
// than Solitaire's felt-table useTableColors().
export function SettingsSection({ label, caption, children }: SettingsSectionProps) {
  const { colors } = useAutoPaperTheme()
  return (
    <View style={styles.section}>
      {(label || caption) && (
        <View style={styles.heading}>
          {label && (
            <Text variant='labelMedium' style={[styles.label, { color: colors.onSurfaceVariant }]}>
              {label}
            </Text>
          )}
          {caption && (
            <Text variant='bodySmall' style={{ color: colors.onSurfaceVariant }}>
              {caption}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    gap: 2
  },
  label: {
    letterSpacing: 2
  },
  section: {
    gap: 12
  }
})
