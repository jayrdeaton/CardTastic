import { createGameGuideSlice } from '@tastic/shell'

// Which version of Six-Card Golf's own How to Play cards (guideSteps.tsx) this player has finished or skipped. A store
// saved before Six-Card Golf has no key, which reads as not seen, so its cards show on the tile's first tap. Bump the
// version only for a real change to how it plays: everyone sees the cards again.
export const SIX_CARD_GOLF_GUIDE_VERSION = 1

export const sixCardGolfGuide = createGameGuideSlice('sixCardGolfGuide')
