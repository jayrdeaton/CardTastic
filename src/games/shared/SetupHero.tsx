// A setup screen's hero (Jay, 2026-11-21): the game's own preview, the picture on its Home tile, at the top of its setup screen,
// over everything else. It takes what height the screen has left over the content under it, up to the card's width at the
// preview's shape, and goes when that's too little to read (a short phone with the rules open, a phone held sideways). With one
// person only: two people's setup screen has their halves to fill. The preview art is drawn at 3x for it (assets/previewFaces).

import { useAutoPaperTheme } from '@rific/auto-paper'
import { WELL_SHADOW } from '@tastic/hud/chrome'
import { PREVIEW_ASPECT, usePackGame, useSeatColors } from '@tastic/shell'
import { type ReactNode, useEffect, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { isMotionReduced } from '@/components/reducedMotionFlag'

/** The shell's header over a setup screen: its Back, title and Settings row (8pt from the top and 52pt tall). */
const SHELL_HEADER = 60
/** Kept clear around the content, past the screen's bottom inset: the shell centres it, so half goes above the hero, half under
 * the content. */
const BOTTOM_MARGIN = 48
/** Under the hero, the setup column's own gap. */
const HERO_GAP = 24
/** Shorter than this, the preview's cards are too small to read: no hero. */
export const MIN_HERO_HEIGHT = 96
/** How long the hero takes to open the first time the screen lays out. */
const HERO_OPEN_MS = 220

// Each game's content height as last laid out, so a setup screen opened again starts at its hero's height with no slide
const lastContentHeight = new Map<string, number>()

/**
 * The hero over a setup screen's content. `width` is the content's (the hero is as wide, at most). `below` is any height the shell
 * draws under the content (READY? and its gap), which the hero leaves room for. The content's height is measured, so the hero
 * gives way as it grows (the rules opening) and comes back as it shrinks.
 */
export function WithSetupHero({ game, enabled, width, below = 0, children }: { game: string; enabled: boolean; width: number; below?: number; children: ReactNode }) {
  const window = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [contentHeight, setContentHeight] = useState(() => lastContentHeight.get(game) ?? 0)
  const room = window.height - insets.top - insets.bottom - SHELL_HEADER - BOTTOM_MARGIN - below - contentHeight - HERO_GAP
  const target = Math.min(Math.round(width / PREVIEW_ASPECT), Math.floor(room))
  const show = enabled && contentHeight > 0 && target >= MIN_HERO_HEIGHT
  // The hero and the gap under it
  const height = useSharedValue(lastContentHeight.has(game) && show ? target + HERO_GAP : 0)

  useEffect(() => {
    const next = show ? target + HERO_GAP : 0
    // The first time in, it slides open (as the rules do); after that it follows the content as it moves, frame by frame
    if (height.value === 0 && next > 0) height.value = withTiming(next, { duration: isMotionReduced() ? 0 : HERO_OPEN_MS, easing: Easing.out(Easing.cubic) })
    else height.value = next
  }, [show, target, height])

  function measured(event: LayoutChangeEvent) {
    const next = Math.round(event.nativeEvent.layout.height)
    lastContentHeight.set(game, next)
    setContentHeight(next)
  }

  const slotStyle = useAnimatedStyle(() => ({ height: height.value }))
  const heroStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, height.value / (MIN_HERO_HEIGHT + HERO_GAP)) }))

  return (
    <View style={styles.column}>
      {enabled && (
        <Animated.View style={[styles.heroSlot, slotStyle]} pointerEvents='none'>
          {/* At the slot's foot as it opens, rising out of the space above the content rather than over it */}
          <Animated.View style={[styles.heroAnchor, heroStyle]}>{show && <SetupHero game={game} height={target} />}</Animated.View>
        </Animated.View>
      )}
      <View style={styles.content} onLayout={measured}>
        {children}
      </View>
    </View>
  )
}

/** The game's Home preview at `height`, at its shape, on a card like the setup screen's wells. */
function SetupHero({ game, height }: { game: string; height: number }) {
  const definition = usePackGame(game)
  const { p1Color, p2Color } = useSeatColors(false)
  const { dark } = useAutoPaperTheme()
  const Preview = definition?.Preview
  if (!Preview) return null
  const width = Math.round(height * PREVIEW_ASPECT)
  // The shadow outside, the clip to the corners inside (a view that clips may clip its own shadow on iOS)
  return (
    <View style={[styles.hero, { width, height }]} testID={`${game}-hero`} accessibilityRole='image' accessibilityLabel={`${definition.title} preview`}>
      <View style={[styles.heroClip, { backgroundColor: dark ? HERO_DARK_BG : HERO_LIGHT_BG }]}>
        <Preview width={width} height={height} p1Color={p1Color} p2Color={p2Color} dark={dark} />
      </View>
    </View>
  )
}

// Home's preview box behind a preview that draws no felt of its own (the shell's HomeScreen)
const HERO_LIGHT_BG = '#FAFAFA'
const HERO_DARK_BG = '#050505'

const styles = StyleSheet.create({
  column: {
    alignItems: 'center'
  },
  content: {
    alignItems: 'center'
  },
  // The wells' corners and shadow
  hero: {
    borderRadius: 12,
    boxShadow: WELL_SHADOW
  },
  heroAnchor: {
    alignItems: 'center',
    bottom: HERO_GAP,
    left: 0,
    position: 'absolute',
    right: 0
  },
  heroClip: {
    borderRadius: 12,
    flex: 1,
    overflow: 'hidden'
  },
  // The hero and its gap, growing as it opens: the column's full width, so it is never a zero frame
  heroSlot: {
    alignSelf: 'stretch'
  }
})
