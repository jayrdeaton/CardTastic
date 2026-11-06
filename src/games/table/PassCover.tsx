// The card over a pass-and-play table (Gin Rummy) while the phone changes hands: who to pass it to, what the last player
// did that the next one didn't see (they looked away while it was played), and one Ready. Both hands lie face down
// under it, so whoever is holding the phone sees nothing of either. There's no other way on, and Android's back button
// does nothing while it's up, so a stray touch while the phone is handed over can't end it early or reach the table.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { DialogHeader, overlayActionStyles, OverlayBackdrop, OverlayCard, useCompactDialog, useOverlayCardColors } from '@tastic/hud/chrome'
import { useEffect } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { GAME_DIALOG_Z_INDEX } from '@/components/GameChrome'

import type { Seat } from './TableChrome'

export function PassCover({ seat, message, onReady, testID }: { seat: Seat; message: string; onReady: () => void; testID: string }) {
  const { colors } = useAutoPaperTheme()
  const { fg } = useOverlayCardColors()
  const { compact, onLayout } = useCompactDialog()

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => subscription.remove()
  }, [])

  return (
    <OverlayBackdrop style={styles.overlay} onLayout={onLayout}>
      <OverlayCard style={styles.card} accessibilityViewIsModal testID={testID}>
        <DialogHeader icon='account-arrow-right' title={`Pass to ${seat.name}`} compact={compact} />
        <Text variant='bodyLarge' style={[styles.body, { color: fg }]}>
          {message}
        </Text>
        <View style={overlayActionStyles.actions}>
          <Button mode='contained' onPress={onReady} style={overlayActionStyles.actionButtonSingle} buttonColor={colors.primary} textColor={colors.onPrimary} testID={`${testID}-ready`}>
            Ready
          </Button>
        </View>
      </OverlayCard>
    </OverlayBackdrop>
  )
}

const styles = StyleSheet.create({
  body: { textAlign: 'center' },
  card: { width: '100%' },
  overlay: { paddingHorizontal: 24, zIndex: GAME_DIALOG_Z_INDEX }
})
