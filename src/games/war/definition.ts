import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { WAR_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { WAR_GUIDE_VERSION, warGuide } from './guide'
import { getWarGuideSteps, type WarGuideInput } from './guideSteps'
import { useWarLoadout } from './useWarLoadout'
import { WarPreview } from './WarPreview'
import { WarScreen } from './WarScreen'
import { WarStatsSections } from './WarStats'

export const WAR_TITLE = 'War'

/** War in the pack (pack.ts): for two players face to face, or one against a CPU that just plays along (War has no
 * decisions). Its setup screen picks seat 2 and the match's length; a match isn't saved. */
export const war: GameDefinition = {
  id: 'war',
  title: WAR_TITLE,
  blurb: 'Higher card wins. Ties go to war.',
  reducers: { warGuide: warGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Face to face on a phone or tablet; at a computer the two people sit side by side, here and at the table, where player 2's side is
  // drawn upright (useFaceToFace).
  sideBySideAtComputer: true,
  useLoadout: useWarLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: WarScreen,
  Preview: WarPreview,
  StatsSections: WarStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: WAR_TITLE, rules: WAR_RULES, scoring: false }),
  guide: {
    version: WAR_GUIDE_VERSION,
    selectVersionSeen: warGuide.selectVersionSeen,
    markSeen: warGuide.actions.markSeen,
    selectInput: (state): WarGuideInput => ({ down: (state as unknown as RootState).settings.warDown }),
    getSteps: (input, context) => getWarGuideSteps(context, input as WarGuideInput)
  }
}
