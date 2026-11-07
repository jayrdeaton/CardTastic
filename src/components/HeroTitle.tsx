import { clamp } from '@tastic/core'
import type { HeroTitleProps } from '@tastic/shell'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { CARD_FONT_FAMILY } from './cardFont'
import { HeroCards } from './HeroCards'
import { HERO_FAN_HEIGHT, HERO_FAN_SPAN } from './heroFan'

// Upright, the title at its natural size; in the wide layout's left pane a little smaller.
const TITLE_FONT_SIZE = 32
const WIDE_TITLE_FONT_SIZE = 28
// How far the wide layout may shrink the fan, and no further than 0.8 in a short window (a phone held sideways).
const HERO_MIN_SCALE = 0.55
const SHORT_WINDOW_HEIGHT = 500
const SHORT_WINDOW_MAX_SCALE = 0.8
// The title and subtitle under the fan in the wide pane at the default text size: the height the fan gives up to them.
// Dynamic Type is capped there (WIDE_MAX_FONT_SCALE): the pane doesn't scroll, and a landscape phone has no room.
const WIDE_TEXT_HEIGHT = 70
const WIDE_MAX_FONT_SCALE = 1.3

/** The fan's scale in the box Home's wide layout gives the hero (`fit`: the left pane's width, and its height above
 * seat 1's button), less the title and subtitle under it. Pure, for tests. */
export function heroScaleFor(fit: { width: number; height: number }, windowHeight: number): number {
  const maxScale = windowHeight < SHORT_WINDOW_HEIGHT ? SHORT_WINDOW_MAX_SCALE : 1
  return clamp(Math.min(maxScale, fit.width / HERO_FAN_SPAN, (fit.height - WIDE_TEXT_HEIGHT) / HERO_FAN_HEIGHT), HERO_MIN_SCALE, 1)
}

/** Home's hero (the pack's `HeroTitle`): the fan of card backs, "CardTastic" and the line under it (the pack's
 * `wordmark`). Upright it is its natural size, at the top of Home's column; in the wide layout it shrinks to the left
 * pane (`fit`). The fan rests while Home is covered or the app is in the background (`active`). Purely decorative: it
 * takes no touches. */
export function HeroTitle({ words, color, active, fit }: HeroTitleProps) {
  const { height } = useWindowDimensions()
  const scale = fit ? heroScaleFor(fit, height) : 1
  const maxFontScale = fit ? WIDE_MAX_FONT_SCALE : undefined
  return (
    <View style={styles.hero} pointerEvents='none'>
      <HeroCards scale={scale} active={active} />
      <Text style={[styles.heading, { color, fontSize: fit ? WIDE_TITLE_FONT_SIZE : TITLE_FONT_SIZE }]} maxFontSizeMultiplier={maxFontScale}>
        {words[0]}
      </Text>
      <Text style={styles.subheading} maxFontSizeMultiplier={maxFontScale}>
        {words[1]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: CARD_FONT_FAMILY,
    fontWeight: '800'
  },
  hero: {
    alignItems: 'center'
  },
  subheading: {
    color: '#E6F4EA',
    fontFamily: CARD_FONT_FAMILY,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center'
  }
})
