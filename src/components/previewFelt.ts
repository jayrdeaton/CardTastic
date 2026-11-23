import { createContext, useContext } from 'react'

// Whether a game's preview paints its own felt. Home's tiles want it (the preview sits in a box on the tile's surface); a setup
// screen's hero turns it off (games/shared/SetupHero.tsx), so its cards lie straight on the screen's felt rather than on a flat
// rectangle a shade off the felt's vignette.
export const PreviewFeltContext = createContext(true)

/** True when the preview should paint its felt behind its cards. */
export const usePreviewFelt = (): boolean => useContext(PreviewFeltContext)
