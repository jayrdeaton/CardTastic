// The hint's mark (Jay, 2026-11-07): a soft halo in the hint color round the card or run to move, breathing like the old
// ring did (startHintPulse), in place of a ring line on the card's edge. The halo is a view with nothing but a box shadow,
// which draws only outside its own box on every platform, so it never tints the card it marks. A column draws it under its
// cards (PileView), so it shows round the run and never over the card above it; a card on its own (the waste, a
// foundation, a freecell, a Pyramid or TriPeaks cell, an empty slot) draws it on itself (PlayingCard's `hinted`).
// The table games' "your move" glow (games/table/PileGlow.tsx) is the same halo.

import { useCardSize } from '@tastic/cards'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { startHintPulse } from './hintAnimation'
import { cardRadiusForWidth, useTableColors } from './theme'

/** The halo's box shadow for a card this wide: a 96pt card gets 23pt of blur and 6 of spread, and it shrinks with the
 * card down to 18 and 5, no further. Under a column the halo only shows below the run and in the gaps between columns
 * (2pt on a phone), so a phone's ~50pt cards need about as much halo as a table game's bigger ones to be seen. */
export function hintGlowShadow(cardWidth: number, color: string): string {
  const blur = Math.max(18, Math.round(cardWidth * 0.24))
  const spread = Math.max(5, Math.round(cardWidth * 0.06))
  return `0 0 ${blur}px ${spread}px ${color}`
}

/** The breathing halo, filling its parent (a card, an empty slot, or PileView's box round a run), `outset` points past
 * each edge (an empty slot's dashed border sits outside its content box). Mounted only while something is hinted, so it
 * starts each hint at full strength and takes its animation with it when the hint ends. */
export function HintGlow({ outset = 0 }: { outset?: number }) {
  const color = useTableColors().hintGreen
  const { width } = useCardSize()
  const opacity = useSharedValue(1)
  const breathe = useAnimatedStyle(() => ({ opacity: opacity.value }))
  useEffect(() => {
    startHintPulse(opacity)
    return () => cancelAnimation(opacity)
  }, [opacity])
  return <Animated.View pointerEvents='none' testID='hint-glow' style={[styles.glow, { borderRadius: cardRadiusForWidth(width) + outset, bottom: -outset, boxShadow: hintGlowShadow(width, color), left: -outset, right: -outset, top: -outset }, breathe]} />
}

/** How a pile beside others (a column, a freecell, the reserve, the waste and the stock) stacks against them: a level over
 * its neighbours, unless it's the one glowing, so they cover its halo instead of the halo covering their faces. Siblings
 * only: React Native orders zIndex among siblings, and React Native Web makes every view its own stacking context (z-index
 * 0), so this never lifts a pile over anything outside its own row. */
export function hintStacking(glowing: boolean) {
  return glowing ? styles.under : styles.over
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  over: { zIndex: 1 },
  under: { zIndex: 0 }
})
