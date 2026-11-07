import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { RATSLAP_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { RATSLAP_GUIDE_VERSION, ratslapGuide } from './guide'
import { getRatSlapGuideSteps, type RatSlapGuideInput } from './guideSteps'
import { RatSlapPreview } from './RatSlapPreview'
import { RatSlapScreen } from './RatSlapScreen'
import { RatSlapStatsSections } from './RatSlapStats'
import { useRatSlapLoadout } from './useRatSlapLoadout'

export const RATSLAP_TITLE = 'RatSlap'

/** RatSlap in the pack (pack.ts): the first game here for two players, seat 2 the CPU or a person, chosen with the rules
 * on the shell's setup screen (useRatSlapLoadout). Two people sit face to face at the phone's short edges, in a phone's or
 * tablet's browser too; at a computer they sit side by side, player 2's side of the table upright (useFaceToFace).
 * A match isn't saved, so a cold launch never comes back to one, and it hides the status bar (the table lies flat; nothing
 * reads it). Its own How to Play shows on the tile's first tap (guideSteps.tsx). */
export const ratslap: GameDefinition = {
  id: 'ratslap',
  title: RATSLAP_TITLE,
  blurb: 'Slap doubles and sandwiches.',
  reducers: { ratslapGuide: ratslapGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Face to face on a phone or tablet; at a computer the two people sit side by side, here and at the table, where player 2's side is
  // drawn upright (useFaceToFace).
  sideBySideAtComputer: true,
  useLoadout: useRatSlapLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: RatSlapScreen,
  Preview: RatSlapPreview,
  StatsSections: RatSlapStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: RATSLAP_TITLE, rules: RATSLAP_RULES, scoring: false }),
  guide: {
    version: RATSLAP_GUIDE_VERSION,
    selectVersionSeen: ratslapGuide.selectVersionSeen,
    markSeen: ratslapGuide.actions.markSeen,
    selectInput: (state): RatSlapGuideInput => {
      const { settings } = state as unknown as RootState
      return { doubles: settings.ratslapDoubles, sandwiches: settings.ratslapSandwiches, jokers: settings.ratslapJokers }
    },
    getSteps: (input, context) => getRatSlapGuideSteps(input as RatSlapGuideInput, context)
  }
}
