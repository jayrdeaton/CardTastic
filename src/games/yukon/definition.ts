import { gameStatsSections } from '@/components/SolitaireStats'
import { YUKON_RULES } from '@/constants/gameRules'
import { gamePreview, gameRules, type SolitaireGameDefinition } from '@/games/shared/gameDefinition'
import { GAME_TITLES } from '@/stores/statsTypes'

import { buildYukonPreview } from './previewLayout'
import YukonScreen from './YukonScreen'

/** Yukon in the pack (pack.ts): see games/shared/gameDefinition.tsx. */
export const yukon: SolitaireGameDefinition = {
  id: 'yukon',
  title: GAME_TITLES.yukon,
  blurb: 'No stock. Move any stack, anywhere.',
  reducers: {},
  // Its play screen saves and restores its own board (stores/gameInProgress.ts), so a cold launch comes back to it.
  resumable: true,
  // The status bar shows while the phone is held upright, as on Home (the pack's useScreenOptions).
  keepStatusBar: true,
  PlayScreen: YukonScreen,
  Preview: gamePreview('yukon', buildYukonPreview),
  // Its rule sets on the Stats tab.
  StatsSections: gameStatsSections('yukon'),
  Rules: gameRules(GAME_TITLES.yukon, YUKON_RULES)
}
