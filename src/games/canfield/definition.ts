import { gameStatsSections } from '@/components/SolitaireStats'
import { CANFIELD_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import CanfieldScreen from './CanfieldScreen'
import { buildCanfieldPreview } from './previewLayout'

/** Canfield in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const canfield: SolitaireGameDefinition = {
  id: 'canfield',
  title: GAME_TITLES.canfield,
  blurb: 'Foundations start wherever the deck says.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: CanfieldScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('canfield'),
  Preview: gamePreview('canfield', buildCanfieldPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('canfield'),
  Rules: gameRules(GAME_TITLES.canfield, CANFIELD_RULES)
}
