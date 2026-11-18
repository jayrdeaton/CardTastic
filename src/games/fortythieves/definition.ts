import { gameStatsSections } from '@/components/SolitaireStats'
import { FORTYTHIEVES_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import FortyThievesScreen from './FortyThievesScreen'
import { buildFortyThievesPreview } from './previewLayout'

/** Forty Thieves in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const fortythieves: SolitaireGameDefinition = {
  id: 'fortythieves',
  title: GAME_TITLES.fortythieves,
  blurb: 'Two decks, eight foundations, no mercy.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: FortyThievesScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('fortythieves'),
  Preview: gamePreview('fortythieves', buildFortyThievesPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('fortythieves'),
  Rules: gameRules(GAME_TITLES.fortythieves, FORTYTHIEVES_RULES)
}
