import { gameStatsSections } from '@/components/SolitaireStats'
import { GOLF_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import GolfScreen from './GolfScreen'
import { buildGolfPreview } from './previewLayout'

/** Golf in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const golf: SolitaireGameDefinition = {
  id: 'golf',
  title: GAME_TITLES.golf,
  blurb: 'Clear the tableau, one rank up or down.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: GolfScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('golf'),
  Preview: gamePreview('golf', buildGolfPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('golf'),
  Rules: gameRules(GAME_TITLES.golf, GOLF_RULES)
}
