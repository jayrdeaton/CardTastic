import { Platform } from 'react-native'

/** Whether card backs are drawn from the pre-rasterized layers in cardBackBitmaps.ts (scripts/generate-card-back-bitmaps.mjs)
 * instead of live react-native-svg. Android only for now: there react-native-svg draws every SVG in software on the main
 * thread the first time it shows, and a back is ~10 native views to mount (CLAUDE.md, "Bitmap card backs on Android"). iOS
 * and the web keep the SVG. */
export const BITMAP_CARD_BACKS = Platform.OS === 'android'
