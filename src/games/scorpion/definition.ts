import { gameStatsSections } from '@/components/SolitaireStats'
import { SCORPION_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { GAME_TITLES } from '@/stores/statsTypes'

import { buildScorpionPreview } from './previewLayout'
import ScorpionScreen from './ScorpionScreen'

/** Scorpion in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const scorpion: SolitaireGameDefinition = {
  id: 'scorpion',
  title: GAME_TITLES.scorpion,
  blurb: 'Build same-suit runs, any group moves.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: ScorpionScreen,
  // Its rules and today's Daily Deal, before a game
  useLoadout: solitaireLoadout('scorpion'),
  Preview: gamePreview('scorpion', buildScorpionPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('scorpion'),
  Rules: gameRules(GAME_TITLES.scorpion, SCORPION_RULES)
}
