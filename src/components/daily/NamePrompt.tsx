import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { DialogHeader, overlayActionStyles, OverlayBackdrop, OverlayCard, SecondaryButton, useCompactDialog, useOverlayCardColors } from '@tastic/hud/chrome'
import { MAX_PROFILE_NAME_LENGTH } from '@tastic/profile'
import { useEffect, useRef, useState } from 'react'
import { BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { Portal, Text, TextInput } from 'react-native-paper'

interface NamePromptProps {
  visible: boolean
  // The button: Play before a deal, Continue before the board
  confirmLabel: string
  // The name typed, trimmed and never empty
  onDone: (name: string) => void
  onCancel: () => void
}

/** A new profile's tag from its name: its first letter (or emoji), as HexFleet makes a guest's. */
export const tagOfName = (name: string) => (Array.from(name.trim())[0] ?? '').toUpperCase()

/**
 * Who's Playing?, for a guest about to play a Daily Deal or open its board: a Daily is always a profile's (stores/online.ts), so a
 * guest names one (Jay, 2026-11-20, as HexFleet makes a guest's typed name a profile when they go online). @tastic/hud's
 * ConfirmDialog look, with a name field under the message. Android's back cancels it, as ConfirmDialog's does.
 */
export function NamePrompt({ visible, confirmLabel, onDone, onCancel }: NamePromptProps) {
  const { colors } = useAutoPaperTheme()
  const { fg } = useOverlayCardColors()
  const { compact, onLayout } = useCompactDialog()
  const [name, setName] = useState('')
  const trimmed = name.trim()

  // Through a ref, so the back listener is added once per opening (ConfirmDialog's idiom)
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })
  useEffect(() => {
    if (!visible) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancelRef.current()
      return true
    })
    return () => subscription.remove()
  }, [visible])

  if (!visible) return null
  const done = () => {
    if (trimmed) onDone(trimmed)
  }

  return (
    <Portal>
      <OverlayBackdrop style={styles.overlay} onLayout={onLayout}>
        {/* The keyboard comes up with the field: on iOS the card rises above it */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoider}>
          <OverlayCard style={styles.card}>
            <DialogHeader icon='account-plus-outline' title="Who's Playing?" color={colors.primary} compact={compact} />
            <Text variant='bodyLarge' style={[styles.body, { color: fg }]}>
              Daily Deals are played as a profile. Type your name to make one.
            </Text>
            <TextInput mode='outlined' dense value={name} onChangeText={setName} maxLength={MAX_PROFILE_NAME_LENGTH} placeholder='Your name' accessibilityLabel='Your name' autoFocus autoCapitalize='words' returnKeyType='done' onSubmitEditing={done} style={styles.field} testID='daily-name-input' />
            <View style={overlayActionStyles.actions}>
              <SecondaryButton onPress={onCancel}>Cancel</SecondaryButton>
              <Button mode='contained' onPress={done} disabled={!trimmed} style={overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary} testID='daily-name-play'>
                {confirmLabel}
              </Button>
            </View>
          </OverlayCard>
        </KeyboardAvoidingView>
      </OverlayBackdrop>
    </Portal>
  )
}

const styles = StyleSheet.create({
  avoider: {
    alignItems: 'center',
    width: '100%'
  },
  body: {
    textAlign: 'center'
  },
  // ConfirmDialog's: the card takes its full allowance (hud's card caps it at 360)
  card: {
    width: '100%'
  },
  // As wide as the buttons, and see-through on the frosted card
  field: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent'
  },
  overlay: {
    paddingHorizontal: 24
  }
})
