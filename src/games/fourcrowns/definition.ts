import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { FOUR_CROWNS_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { FourCrownsPreview } from './FourCrownsPreview'
import { FourCrownsScreen } from './FourCrownsScreen'
import { FourCrownsStatsSections } from './FourCrownsStats'
import { CROWNS_GUIDE_VERSION, fourCrownsGuide } from './guide'
import { type CrownsGuideInput, getCrownsGuideSteps } from './guideSteps'
import { useCrownsLoadout } from './useCrownsLoadout'

export const FOUR_CROWNS_TITLE = 'Four Crowns'

/** Four Crowns in the pack (pack.ts): the family's rummy with a wild that changes every round, for two to four players.
 * Seat 2 is the shell's (a CPU or a person); seats 3 and 4 are picked on its setup screen. With one person and CPUs it's
 * one person's table; with more, the phone is passed, the table drawn for whoever's turn it is and covered while it
 * changes hands. A match isn't saved. */
export const fourcrowns: GameDefinition = {
  id: 'fourcrowns',
  title: FOUR_CROWNS_TITLE,
  blurb: 'Rummy where the wild changes every round.',
  reducers: { fourCrownsGuide: fourCrownsGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Nobody sits across from anyone (the phone is passed), so in a wide window the setup screen seats them side by side.
  sideBySideWhenWide: true,
  useLoadout: useCrownsLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: FourCrownsScreen,
  Preview: FourCrownsPreview,
  StatsSections: FourCrownsStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: FOUR_CROWNS_TITLE, rules: FOUR_CROWNS_RULES, scoring: false }),
  guide: {
    version: CROWNS_GUIDE_VERSION,
    selectVersionSeen: fourCrownsGuide.selectVersionSeen,
    markSeen: fourCrownsGuide.actions.markSeen,
    selectInput: (state): CrownsGuideInput => {
      const { crownsDeck, crownsLastTurns } = (state as unknown as RootState).settings
      return { jokers: crownsDeck !== 'plain', lastTurns: crownsLastTurns }
    },
    getSteps: (input, context) => getCrownsGuideSteps(context, input as CrownsGuideInput)
  }
}
