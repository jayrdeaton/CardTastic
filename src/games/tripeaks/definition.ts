import { gameStatsSections } from '@/components/SolitaireStats'
import { TRIPEAKS_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import { buildTriPeaksPreview } from './previewLayout'
import TriPeaksScreen from './TriPeaksScreen'

/** TriPeaks in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const tripeaks: SolitaireGameDefinition = {
  id: 'tripeaks',
  title: GAME_TITLES.tripeaks,
  blurb: 'Clear three peaks, one rank up or down.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: TriPeaksScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('tripeaks'),
  Preview: gamePreview('tripeaks', buildTriPeaksPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('tripeaks'),
  Rules: gameRules(GAME_TITLES.tripeaks, TRIPEAKS_RULES)
}
