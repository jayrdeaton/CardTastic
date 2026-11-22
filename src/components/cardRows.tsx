// A card of rows on a setup screen (Jay, 2026-11-21: "I don't like that the touchable part isn't the whole card"): each row runs
// edge to edge, so a card holding one row is one touch target, and a card holding two is split between them. The rows (components/
// RuleRows.tsx, components/daily/DailyRow.tsx) read InCardContext and take the card's insets themselves; in the Settings sheet, a
// list on the sheet's own padding, they keep their own rounded highlight.

import { useWellColors, WELL_SHADOW } from '@tastic/hud/chrome'
import { createContext, type ReactNode } from 'react'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'

/** Whether a row sits in a card (CardWell), edge to edge. */
export const InCardContext = createContext(false)

/** A row's padding in a card: the stats wells' 16pt sides, and 14 above and below (a row's 36pt badge is 64pt tall). */
export const CARD_ROW_INSET = 16
export const CARD_ROW_VERTICAL = 14
const RADIUS = 12

/**
 * A well (hud's wellSurface: the theme's surface on MD3's level-1 shadow, the stats screen's and Home's tiles' card) whose rows run to
 * its edges. Two views: the shadow on the outside, and inside a clip to the rounded corners for the rows' highlight (a view that clips
 * may clip its own shadow on iOS).
 */
export function CardWell({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const well = useWellColors()
  return (
    <View style={[styles.well, { backgroundColor: well.bg }, style]} testID={testID}>
      <View style={styles.clip}>
        <InCardContext.Provider value>{children}</InCardContext.Provider>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: RADIUS,
    overflow: 'hidden'
  },
  well: {
    borderRadius: RADIUS,
    boxShadow: WELL_SHADOW
  }
})
