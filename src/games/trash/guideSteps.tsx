import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt, NoArt } from '@/games/table/guideArt'

/** What Trash's cards depend on: the spots a match starts with (the player's own setting). */
export interface TrashGuideInput {
  cards: number
}

// Trash's own How to Play, shown on its tile's first tap: what the spots want, how a turn runs on, the wild Jacks, and
// how the match is won. The guide copy rules (constants/guideSteps.tsx): Title Case titles, bodies in two lines, no
// questions or dashes.
export function getTrashGuideSteps({ cards }: TrashGuideInput): GuideStep[] {
  return [
    {
      title: `Ace to ${cards}`,
      body: `Each spot wants its own rank, from Ace up to ${cards}.`,
      art: <MiniGrid scale={0.6} label='A row of spots, Ace, 2 and 3 filled' rows={[[['A', 'heart'], ['2', 'club'], ['3', 'diamond'], null, null]]} />
    },
    { title: 'Keep Going', body: 'Put a card in its spot, then play the card it covers.', art: <MoveArt from={['4', 'spade']} to={null} label='A 4 going into its face-down spot' /> },
    { title: 'Jacks Are Wild', body: 'A Jack fills any spot. A Queen or King ends your turn.', art: <NoArt yes={['J', 'heart']} no={['Q', 'spade']} label='A Jack fills any spot, a Queen ends the turn' /> },
    { title: 'One Fewer Each Win', body: 'Win a round and you play the next with one spot fewer.', art: <MiniGrid scale={0.6} label='A shorter row of spots' rows={[[null, null, null, null]]} /> }
  ]
}
