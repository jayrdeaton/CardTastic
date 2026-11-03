import { gameStatsSections } from '@/components/SolitaireStats'
import { KLONDIKE_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { GAME_TITLES } from '@/stores/statsTypes'

import KlondikeScreen from './KlondikeScreen'
import { buildKlondikePreview } from './previewLayout'

/** Klondike in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const klondike: SolitaireGameDefinition = {
  id: 'klondike',
  title: GAME_TITLES.klondike,
  blurb: 'The classic. Draw 1 or draw 3.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: KlondikeScreen,
  Preview: gamePreview('klondike', buildKlondikePreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('klondike'),
  Rules: gameRules(GAME_TITLES.klondike, KLONDIKE_RULES)
}
