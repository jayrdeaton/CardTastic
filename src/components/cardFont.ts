import { CARD_FONT_FAMILY } from '@tastic/cards'
import type { FontSource } from 'expo-font'

// The card artwork's own font (see @tastic/cards' artwork/NOTICE.md), which is also the app-wide Paper font (the pack's
// `fontFamily`), so the rest of the UI reads as the same "card" typeface instead of clashing with a plain system sans.
export { CARD_FONT_FAMILY }

// The fonts @tastic/shell loads behind the splash screen's 'fonts' gate (the pack's `fonts`), beside the icon font, so
// neither a decorated card numeral nor any Paper text flashes in a fallback serif first.
//
// Only the Bold weight: every generated decorated-mode text shape hard-codes fontWeight: "bold" (see @tastic/cards'
// src/artwork/decoratedCustom/*.ts), and there's no bundled regular weight for the theme-wide use to fall back to
// either, so every react-native-paper Text renders in this same bold face whatever its own fontWeight - a deliberate
// one-weight-everywhere look, the way the fleet's other apps apply a single MONO_FONT (see @tastic/hud's fonts.ts).
export const CARD_FONTS: Record<string, FontSource> = { [CARD_FONT_FAMILY]: require('dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf') }
