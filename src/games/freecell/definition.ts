import { gameStatsSections } from '@/components/SolitaireStats'
import { FREECELL_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { GAME_TITLES } from '@/stores/statsTypes'

import FreeCellScreen from './FreeCellScreen'
import { buildFreeCellPreview } from './previewLayout'

/** FreeCell in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const freecell: SolitaireGameDefinition = {
  id: 'freecell',
  title: GAME_TITLES.freecell,
  blurb: 'Nearly every deal is winnable.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: FreeCellScreen,
  Preview: gamePreview('freecell', buildFreeCellPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('freecell'),
  Rules: gameRules(GAME_TITLES.freecell, FREECELL_RULES)
}
