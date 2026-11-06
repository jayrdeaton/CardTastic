import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { GIN_RUMMY_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { GinRummyPreview } from './GinRummyPreview'
import { GinRummyScreen } from './GinRummyScreen'
import { GinRummyStatsSections } from './GinRummyStats'
import { GIN_GUIDE_VERSION, ginRummyGuide } from './guide'
import { getGinGuideSteps, type GinGuideInput } from './guideSteps'
import { useGinLoadout } from './useGinLoadout'

export const GIN_RUMMY_TITLE = 'Gin Rummy'

/** Gin Rummy in the pack (pack.ts): the first game here with hands kept hidden. Against the CPU (three levels) it's one
 * person's table; two people pass the phone, the table drawn for whoever's turn it is and covered while it changes hands.
 * Its setup screen picks seat 2 and the score a match plays to; a match isn't saved. */
export const ginrummy: GameDefinition = {
  id: 'ginrummy',
  title: GIN_RUMMY_TITLE,
  blurb: 'Meld sets and runs, then knock.',
  reducers: { ginRummyGuide: ginRummyGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Nobody sits across from anyone (the phone is passed), so on the web the setup screen seats them side by side.
  twoPlayerSeats: { faceToFaceOnWeb: false, followUpsideDown: false },
  useLoadout: useGinLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: GinRummyScreen,
  Preview: GinRummyPreview,
  StatsSections: GinRummyStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: GIN_RUMMY_TITLE, rules: GIN_RUMMY_RULES, scoring: false }),
  guide: {
    version: GIN_GUIDE_VERSION,
    selectVersionSeen: ginRummyGuide.selectVersionSeen,
    markSeen: ginRummyGuide.actions.markSeen,
    selectInput: (state): GinGuideInput => {
      const { ginTarget, ginKnock, ginBonus } = (state as unknown as RootState).settings
      return { target: ginTarget, knock: ginKnock, bonus: ginBonus }
    },
    getSteps: (input, context) => getGinGuideSteps(input as GinGuideInput, context)
  }
}
