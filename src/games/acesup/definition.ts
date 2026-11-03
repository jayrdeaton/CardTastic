import { gameStatsSections } from '@/components/SolitaireStats'
import { ACESUP_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { GAME_TITLES } from '@/stores/statsTypes'

import AcesUpScreen from './AcesUpScreen'
import { buildAcesUpPreview } from './previewLayout'

/** Aces Up in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const acesup: SolitaireGameDefinition = {
  id: 'acesup',
  title: GAME_TITLES.acesup,
  blurb: 'Discard down to just the 4 Aces.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: AcesUpScreen,
  Preview: gamePreview('acesup', buildAcesUpPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('acesup'),
  Rules: gameRules(GAME_TITLES.acesup, ACESUP_RULES)
}
