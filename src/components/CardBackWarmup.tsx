import { Image, StyleSheet, View } from 'react-native'

import { useSettings } from '@/hooks/useSettings'

import { bitmapBackSources } from './BitmapCardBack'
import { CARD_BACK_BITMAPS } from './cardArtBitmaps'
import { BITMAP_CARD_ART } from './cardArtPlatform'
import { NO_IMAGE_FADE } from './imageFade'
import { useTableColors } from './theme'

/** Keeps the player's back style decoded, at every baked width, from launch: mounted once at the root (the pack's
 * Provider), invisible. An Android Image whose bitmap nothing has decoded yet is drawn a frame or two after it mounts, and a
 * game opening was the first to need its width: on the LG Stylo 6 the stock showed without its frame and pattern for the
 * first one or two frames of Klondike and Spider. Once a bitmap is decoded and in use, every new back that shows it is drawn
 * in the frame it mounts (the whole deal, measured). Costs ~4-6 MB of decoded bitmaps while the app runs. */
export function CardBackWarmup() {
  const { settings } = useSettings()
  const colors = useTableColors()
  if (!BITMAP_CARD_ART) return null
  const style = settings.cardBackStyle === 'monogram' ? 'plain' : settings.cardBackStyle
  const sources = CARD_BACK_BITMAPS[style].flatMap((bake) => {
    const layers = bitmapBackSources(style, colors, settings.invertDarkModeColors, bake.width)
    return layers ? [layers.frame, layers.body, layers.pattern, ...(layers.ink ? [layers.ink] : [])] : []
  })
  return (
    <View pointerEvents='none' style={styles.warmup}>
      {sources.map((source, i) => (
        <Image key={i} source={source} style={styles.image} fadeDuration={NO_IMAGE_FADE} />
      ))}
    </View>
  )
}

// A point square, never a zero frame (CLAUDE.md's Fabric view-recycling note), and fully transparent: the bitmaps are
// decoded at their own size whatever size the view draws them.
const styles = StyleSheet.create({
  image: { height: 1, left: 0, position: 'absolute', top: 0, width: 1 },
  warmup: { height: 1, left: 0, opacity: 0, position: 'absolute', top: 0, width: 1 }
})
