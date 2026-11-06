import { createGameGuideSlice } from '@tastic/shell'

// Which version of Four Crowns' own How to Play cards (guideSteps.tsx) this player has finished or skipped. A store
// saved before Four Crowns has no key, which reads as not seen, so its cards show on the tile's first tap. Bump the
// version only for a real change to how it plays: everyone sees the cards again.
export const CROWNS_GUIDE_VERSION = 1

export const fourCrownsGuide = createGameGuideSlice('fourCrownsGuide')
