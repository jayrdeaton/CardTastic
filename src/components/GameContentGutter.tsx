import { computeContentBounds } from '@tastic/core'
import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'

import { useGameLayout } from './gameLayout'

interface GameContentGutterProps {
  maxContentWidth: number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/** A game screen's board column: @tastic/hud's ContentGutter (a centered, width-capped column), but with the wide layout's
 * chrome columns reserved out of the width first.
 *
 * hud's ContentGutter can't do that: it caps against the WHOLE window and splits the leftover equally, while the wide layout
 * needs each side's chrome column (useGameLayout's leftGutter/rightGutter, which differ per side) reserved out of the width
 * first. hud's leftGutter/rightGutter props are decorations drawn inside the leftover, not reserved widths - swapped in, the
 * board would run under the footer and readout columns. */
export function GameContentGutter({ maxContentWidth, style, children }: GameContentGutterProps) {
  // Wide (landscape) layout: the leading/trailing gutters double as the chrome columns (footer icons,
  // moves/timer), so each is reserved out of the width before capping - see gameLayout.ts. Any width
  // left over once the content hits its cap is split equally on top of them, keeping the board centred
  // between the two chrome columns. Portrait: both are 0 - exactly the plain window width.
  const { windowWidth, leftGutter, rightGutter } = useGameLayout()
  const { contentWidth, gutterWidth } = computeContentBounds(windowWidth - leftGutter - rightGutter, maxContentWidth)
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.gutter, { width: leftGutter + gutterWidth }]} />
      <View style={{ width: contentWidth }}>{children}</View>
      <View style={[styles.gutter, { width: rightGutter + gutterWidth }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  gutter: {
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row'
  }
})
