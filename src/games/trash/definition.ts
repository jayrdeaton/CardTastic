import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { TRASH_RULES } from '@/constants/gameRules'
import type { RootState } from '@/redux/store'

import { TRASH_GUIDE_VERSION, trashGuide } from './guide'
import { getTrashGuideSteps, type TrashGuideInput } from './guideSteps'
import { TrashPreview } from './TrashPreview'
import { TrashScreen } from './TrashScreen'
import { TrashStatsSections } from './TrashStats'
import { useTrashLoadout } from './useTrashLoadout'

export const TRASH_TITLE = 'Trash'

/** Trash in the pack (pack.ts): for two players, or one against the CPU, seated as in RatSlap. Nothing is hidden from
 * anyone, so it plays on one phone. Its setup screen picks seat 2 and the starting spots; a match isn't saved. */
export const trash: GameDefinition = {
  id: 'trash',
  title: TRASH_TITLE,
  blurb: 'Two players. Fill your spots, Ace to 10.',
  reducers: { trashGuide: trashGuide.reducer },
  seatTwo: ['cpu', 'person'],
  twoPlayerSeats: { faceToFaceOnWeb: true, followUpsideDown: false },
  useLoadout: useTrashLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: TrashScreen,
  Preview: TrashPreview,
  StatsSections: TrashStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: TRASH_TITLE, rules: TRASH_RULES, scoring: false }),
  guide: {
    version: TRASH_GUIDE_VERSION,
    selectVersionSeen: trashGuide.selectVersionSeen,
    markSeen: trashGuide.actions.markSeen,
    selectInput: (state): TrashGuideInput => ({ cards: (state as unknown as RootState).settings.trashCards }),
    getSteps: (input) => getTrashGuideSteps(input as TrashGuideInput)
  }
}
