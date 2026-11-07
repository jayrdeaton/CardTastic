import { type AnyCard } from '@tastic/cards'
import type { GameDefinition, GamePreviewProps, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { SLAPJACK_RULES } from '@/constants/gameRules'
import { SlapPreview } from '@/games/ratslap/RatSlapPreview'
import { SlapStatsSection } from '@/games/ratslap/RatSlapStats'
import type { RootState } from '@/redux/store'

import { SLAPJACK_GUIDE_VERSION, slapjackGuide } from './guide'
import { getSlapjackGuideSteps, type SlapjackGuideInput } from './guideSteps'
import { SlapjackScreen } from './SlapjackScreen'
import { useSlapjackLoadout } from './useSlapjackLoadout'

export const SLAPJACK_TITLE = 'Slapjack'

const FOUR_OF_CLUBS: AnyCard = { id: 'preview-clubs-4', suit: 'clubs', rank: 4, faceUp: true }
const JACK_OF_HEARTS: AnyCard = { id: 'preview-hearts-11', suit: 'hearts', rank: 11, faceUp: true }

/** Slapjack in the pack (pack.ts): RatSlap's table under simpler rules, for two players or one against the CPU, seated
 * the same way. Its setup screen has only seat 2 (the CPU's level is on its menu); a match isn't saved. */
export const slapjack: GameDefinition = {
  id: 'slapjack',
  title: SLAPJACK_TITLE,
  blurb: 'Slap every Jack.',
  reducers: { slapjackGuide: slapjackGuide.reducer },
  seatTwo: ['cpu', 'person'],
  // Face to face on a phone or tablet; at a computer the two people sit side by side, here and at the table, where player 2's side is
  // drawn upright (useFaceToFace).
  sideBySideAtComputer: true,
  useLoadout: useSlapjackLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: SlapjackScreen,
  Preview: (props: GamePreviewProps) => createElement(SlapPreview, { ...props, under: FOUR_OF_CLUBS, top: JACK_OF_HEARTS }),
  StatsSections: ({ profileId }: { profileId: string | null }) => createElement(SlapStatsSection, { game: 'slapjack', label: 'SLAPJACK', profileId }),
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: SLAPJACK_TITLE, rules: SLAPJACK_RULES, scoring: false }),
  guide: {
    version: SLAPJACK_GUIDE_VERSION,
    selectVersionSeen: slapjackGuide.selectVersionSeen,
    markSeen: slapjackGuide.actions.markSeen,
    selectInput: (state): SlapjackGuideInput => ({ penalty: (state as unknown as RootState).settings.slapjackPenalty }),
    getSteps: (input, context) => getSlapjackGuideSteps(context, input as SlapjackGuideInput)
  }
}
