// The "your move" mark at a card table: a soft halo in the hint ring's color behind a card or a pile, breathing like
// the solitaire hint (startHintPulse). It replaced an outline round the top card (Jay, 2026-11-07), which cut straight
// across a stack's under-cards: every stock and deck here fans its under-cards a few points down and to the right. The
// halo is a card-sized view with nothing but a box shadow, which draws only outside its own box on every platform, so
// drawn under the cards it shows round the whole pile and never over a card, and round an empty slot it leaves the
// slot's own outline alone. The halo is the solitaire hint's (components/hintGlow.tsx), sized to the card.

import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { cancelAnimation, type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { startHintPulse } from '@/components/hintAnimation'
import { hintGlowShadow } from '@/components/hintGlow'
import { cardRadiusForWidth, useTableColors } from '@/components/theme'

import type { Point } from './geometry'

/** One breathing clock for a whole table, so every glow on it brightens and dims together. */
export function usePileGlowPulse(): SharedValue<number> {
  const pulse = useSharedValue(1)
  useEffect(() => {
    startHintPulse(pulse)
    return () => cancelAnimation(pulse)
  }, [pulse])
  return pulse
}

/** The halo behind one card or pile, centered on `at`. Draw it before the cards it sits under. */
export function PileGlow({ at, cardWidth, cardHeight, pulse, testID }: { at: Point; cardWidth: number; cardHeight: number; pulse: SharedValue<number>; testID?: string }) {
  const color = useTableColors().hintGreen
  const breathe = useAnimatedStyle(() => ({ opacity: pulse.value }))
  return <Animated.View pointerEvents='none' testID={testID} style={[styles.glow, { borderRadius: cardRadiusForWidth(cardWidth), boxShadow: hintGlowShadow(cardWidth, color), height: cardHeight, left: at.x - cardWidth / 2, top: at.y - cardHeight / 2, width: cardWidth }, breathe]} />
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' }
})
