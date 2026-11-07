import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { SIX_CARD_GOLF_RULES } from '@/constants/gameRules'

import { SIX_CARD_GOLF_GUIDE_VERSION, sixCardGolfGuide } from './guide'
import { getSixCardGolfGuideSteps } from './guideSteps'
import { SixCardGolfPreview } from './SixCardGolfPreview'
import { SixCardGolfScreen } from './SixCardGolfScreen'
import { SixCardGolfStatsSections } from './SixCardGolfStats'
import { useSixCardGolfLoadout } from './useSixCardGolfLoadout'

/** Not plain Golf: that's the solitaire game, which keeps the name. */
export const SIX_CARD_GOLF_TITLE = 'Six-Card Golf'

/** Six-Card Golf in the pack (pack.ts): for two players, or one against the CPU, seated as in RatSlap. Nothing is hidden
 * from anyone (Jay, 2026-11-04), so it plays on one phone. Its setup screen picks seat 2 and the holes; a match isn't
 * saved. */
export const sixcardgolf: GameDefinition = {
  id: 'sixcardgolf',
  title: SIX_CARD_GOLF_TITLE,
  blurb: 'Swap low, pair up, score least.',
  reducers: { sixCardGolfGuide: sixCardGolfGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Face to face on a phone or tablet; at a computer the two people sit side by side, here and at the table, where player 2's side is
  // drawn upright (useFaceToFace).
  sideBySideAtComputer: true,
  useLoadout: useSixCardGolfLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: SixCardGolfScreen,
  Preview: SixCardGolfPreview,
  StatsSections: SixCardGolfStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: SIX_CARD_GOLF_TITLE, rules: SIX_CARD_GOLF_RULES, scoring: false }),
  guide: {
    version: SIX_CARD_GOLF_GUIDE_VERSION,
    selectVersionSeen: sixCardGolfGuide.selectVersionSeen,
    markSeen: sixCardGolfGuide.actions.markSeen,
    selectInput: () => ({}),
    getSteps: () => getSixCardGolfGuideSteps()
  }
}
