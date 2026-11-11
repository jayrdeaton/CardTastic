import type { GameDefinition, GameRulesProps } from '@tastic/shell'
import { createElement } from 'react'

import { RulesDialog } from '@/components/RulesDialog'
import { SPEED_RULES } from '@/constants/gameRules'
import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { realTimeSeatTwo } from '@/games/table/realTimeSeats'
import type { RootState } from '@/redux/store'

import { SPEED_GUIDE_VERSION, speedGuide } from './guide'
import { getSpeedGuideSteps, type SpeedGuideInput } from './guideSteps'
import { SpeedPreview } from './SpeedPreview'
import { SpeedScreen } from './SpeedScreen'
import { SpeedStatsSections } from './SpeedStats'
import { useSpeedLoadout } from './useSpeedLoadout'

export const SPEED_TITLE = MATCH_GAME_TITLES.speed

/** Speed in the pack (pack.ts): a race with no turns, for two players face to face or one against the CPU in three
 * levels. Its setup screen has only seat 2's menu; a match isn't saved. */
export const speed: GameDefinition = {
  id: 'speed',
  title: SPEED_TITLE,
  blurb: 'No turns. One up or down, fast.',
  reducers: { speedGuide: speedGuide.reducer },
  // The CPU or a person on a phone or tablet, face to face; only the CPU at a computer, whose one mouse can't take two
  // people's taps at the same moment (realTimeSeatTwo).
  get seatTwo() {
    return realTimeSeatTwo()
  },
  useLoadout: useSpeedLoadout,
  resumable: false,
  keepStatusBar: false,
  PlayScreen: SpeedScreen,
  Preview: SpeedPreview,
  StatsSections: SpeedStatsSections,
  Rules: ({ visible, onDismiss }: GameRulesProps) => createElement(RulesDialog, { visible, onDismiss, title: SPEED_TITLE, rules: SPEED_RULES, scoring: false }),
  guide: {
    version: SPEED_GUIDE_VERSION,
    selectVersionSeen: speedGuide.selectVersionSeen,
    markSeen: speedGuide.actions.markSeen,
    selectInput: (state): SpeedGuideInput => {
      const { speedWrap, speedRefill } = (state as unknown as RootState).settings
      return { wrap: speedWrap, refill: speedRefill }
    },
    getSteps: (input, context) => getSpeedGuideSteps(context, input as SpeedGuideInput)
  }
}
