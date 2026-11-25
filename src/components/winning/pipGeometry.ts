// The firework pip's size, kept free of any runtime dependency so scripts/generate-card-art-bitmaps.mjs can bundle it on
// its own: the pre-rasterized pips (cardArtBitmaps.ts) are drawn at exactly these sizes.

/** The glyph's size, in points. */
export const PIP_SIZE = 14
/** The pip's box: room for the spades' width compensation and a quarter turn of the diagonal tarot art. */
export const PIP_BOX = Math.ceil(PIP_SIZE * 1.6)
/** The ring round each pip, in points. A pip is the card's own ink, ringed in the card's own face color, so a black spade reads on the dark felt the
 * way it does on a card (Jay, 2026-10-17). */
export const PIP_OUTLINE_WIDTH = 1.25
