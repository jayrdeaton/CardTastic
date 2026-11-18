import { gameStatsSections } from '@/components/SolitaireStats'
import { PYRAMID_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import { buildPyramidPreview } from './previewLayout'
import PyramidScreen from './PyramidScreen'

/** Pyramid in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const pyramid: SolitaireGameDefinition = {
  id: 'pyramid',
  title: GAME_TITLES.pyramid,
  blurb: 'Pair up cards that sum to 13.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: PyramidScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('pyramid'),
  Preview: gamePreview('pyramid', buildPyramidPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('pyramid'),
  Rules: gameRules(GAME_TITLES.pyramid, PYRAMID_RULES)
}
