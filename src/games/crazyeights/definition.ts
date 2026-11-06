import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { CRAZY_EIGHTS_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { CrazyEightsPreview } from './CrazyEightsPreview'
import { CrazyEightsScreen } from './CrazyEightsScreen'
import { CrazyEightsStatsSections } from './CrazyEightsStats'
import { crazyEightsGuide, EIGHTS_GUIDE_VERSION } from './guide'
import { type EightsGuideInput, getEightsGuideSteps } from './guideSteps'
import { useEightsLoadout } from './useEightsLoadout'

export const CRAZY_EIGHTS_TITLE = 'Crazy Eights'

/** Crazy Eights in the pack (pack.ts): match the pile, 8s wild, first out wins, for two to four players. Seat 2 is the
 * shell's (a CPU or a person); seats 3 and 4 and the house rules are picked on its setup screen. With one person and
 * CPUs it's one person's table; with more, the phone is passed, the table drawn for whoever's turn it is and covered
 * while it changes hands. A game isn't saved. */
export const crazyeights: GameDefinition = {
  id: 'crazyeights',
  title: CRAZY_EIGHTS_TITLE,
  blurb: 'Match the pile, 8s are wild, first out wins.',
  reducers: { crazyEightsGuide: crazyEightsGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Nobody sits across from anyone (the phone is passed), so on the web the setup screen seats them side by side.
  twoPlayerSeats: { faceToFaceOnWeb: false, followUpsideDown: false },
  useLoadout: useEightsLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: CrazyEightsScreen,
  Preview: CrazyEightsPreview,
  StatsSections: CrazyEightsStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: CRAZY_EIGHTS_TITLE, rules: CRAZY_EIGHTS_RULES, scoring: false }),
  guide: {
    version: EIGHTS_GUIDE_VERSION,
    selectVersionSeen: crazyEightsGuide.selectVersionSeen,
    markSeen: crazyEightsGuide.actions.markSeen,
    selectInput: (state): EightsGuideInput => {
      const { eightsDraw, eightsSpecials } = (state as unknown as RootState).settings
      return { draw: eightsDraw, specials: eightsSpecials }
    },
    getSteps: (input, context) => getEightsGuideSteps(context, input as EightsGuideInput)
  }
}
