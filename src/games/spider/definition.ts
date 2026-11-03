import { gameStatsSections } from '@/components/SolitaireStats'
import { SPIDER_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { GAME_TITLES } from '@/stores/statsTypes'

import { buildSpiderPreview } from './previewLayout'
import SpiderScreen from './SpiderScreen'

/** Spider in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const spider: SolitaireGameDefinition = {
  id: 'spider',
  title: GAME_TITLES.spider,
  blurb: '1, 2, or 4 suit difficulty.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: SpiderScreen,
  Preview: gamePreview('spider', buildSpiderPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('spider'),
  Rules: gameRules(GAME_TITLES.spider, SPIDER_RULES)
}
