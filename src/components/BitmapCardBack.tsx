import type { TableColors } from '@tastic/cards'
import React from 'react'
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native'

import { type BitmapBackStyle, CARD_BACK_BITMAPS } from './cardArtBitmaps'
import { NO_IMAGE_FADE } from './imageFade'

// A card back drawn from the pre-rasterized layers in cardArtBitmaps.ts (scripts/generate-card-art-bitmaps.mjs) instead
// of live react-native-svg (where that is: cardArtPlatform.ts). A back is recolored to each player's color, so it is
// layers stacked like the SVG draws them: the frame in full color, then the body and the pattern, each a white mask
// tinted to the player's card back and pattern colors, then (Ornate only) the art's own black. Measured against a direct
// render, the stack is within a fraction of a color level.

/** The widest card a bitmap back is drawn for: a little past the widest bake (CARD_WIDTH_MAX), so nothing is blown up far
 * enough to go soft. A wider card keeps the SVG. */
export const MAX_BITMAP_BACK_WIDTH = 110

/** One back's layers, ready to draw. */
export interface BitmapBackSources {
  frame: ImageSourcePropType
  body: ImageSourcePropType
  pattern: ImageSourcePropType
  ink?: ImageSourcePropType
}

const sourcesCache = new Map<string, BitmapBackSources>()

/** The layers for a back `width` points wide, or null where the SVG should draw it: wider than any bake, or a frame color
 * the bake doesn't have (the palettes changed since the bitmaps were generated). The nearest bake by ratio, so a Geometric
 * back's 1pt lines stay within ~10% of 1pt. The frame's colors are the ones CardBack/DecoratedCardBack would draw it in. */
export function bitmapBackSources(style: BitmapBackStyle, colors: TableColors, invertDarkModeColors: boolean | undefined, width: number): BitmapBackSources | null {
  if (width > MAX_BITMAP_BACK_WIDTH) return null
  const bakes = CARD_BACK_BITMAPS[style]
  let nearest = bakes[0]
  for (const bake of bakes) if (Math.abs(Math.log(bake.width / width)) < Math.abs(Math.log(nearest.width / width))) nearest = bake
  const frameKey = invertDarkModeColors ? `${colors.cardFaceInverted}|${colors.textBlackInverted}` : '#FFFFFF|#000000'
  const frame = nearest.frames[frameKey]
  if (!frame) return null
  // One object per bake and frame, so BitmapCardBack's memo holds across renders.
  const key = `${style}|${nearest.width}|${frameKey}`
  let sources = sourcesCache.get(key)
  if (!sources) {
    sources = { body: nearest.body, frame, ink: nearest.ink, pattern: nearest.pattern }
    sourcesCache.set(key, sources)
  }
  return sources
}

interface BitmapCardBackProps {
  sources: BitmapBackSources
  colors: TableColors
  width: number
  height: number
  invertDarkModeColors?: boolean
}

/** Memoized like the SVG backs: `colors`/`width`/`height` are stable, and a board can show dozens of backs. */
export const BitmapCardBack = React.memo(function BitmapCardBack({ sources, colors, width, height, invertDarkModeColors }: BitmapCardBackProps) {
  const patternColor = invertDarkModeColors ? colors.cardBackPatternInverted : colors.cardBackPattern
  return (
    // Sized, so the layers (only absolute children) never lay out as a zero frame: see CLAUDE.md's Fabric view-recycling note.
    <View style={{ height, width }}>
      <Image source={sources.frame} style={styles.layer} resizeMode='stretch' fadeDuration={NO_IMAGE_FADE} />
      <Image source={sources.body} style={[styles.layer, { tintColor: colors.cardBack }]} resizeMode='stretch' fadeDuration={NO_IMAGE_FADE} />
      <Image source={sources.pattern} style={[styles.layer, { tintColor: patternColor }]} resizeMode='stretch' fadeDuration={NO_IMAGE_FADE} />
      {sources.ink ? <Image source={sources.ink} style={[styles.layer, styles.ink]} resizeMode='stretch' fadeDuration={NO_IMAGE_FADE} /> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  ink: { tintColor: '#000000' },
  layer: { bottom: 0, height: '100%', left: 0, position: 'absolute', right: 0, top: 0, width: '100%' }
})
