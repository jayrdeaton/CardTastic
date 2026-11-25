import { Platform } from 'react-native'

/** Whether card backs and the win's firework pips are drawn from the pre-rasterized bitmaps in cardArtBitmaps.ts
 * (scripts/generate-card-art-bitmaps.mjs) instead of live react-native-svg. Android only for now: there react-native-svg
 * draws every SVG in software on the main thread the first time it shows (CLAUDE.md, "Android performance on the LG
 * Stylo 6"). iOS and the web keep the SVG. */
export const BITMAP_CARD_ART = Platform.OS === 'android'
