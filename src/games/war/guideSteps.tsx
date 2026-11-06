import type { GuideStep } from '@tastic/hud/guide'

import { PlayArt } from '@/games/ratslap/guideSteps'
import { MiniGrid, NoArt } from '@/games/table/guideArt'

import type { WarDown } from './engine/types'

/** What War's cards depend on: how many cards go face down in a war (the player's own setting). */
export interface WarGuideInput {
  down?: WarDown
}

// War's own How to Play, shown on its tile's first tap: how to turn a card over, who takes the battle, and what a tie
// starts. The guide copy rules (constants/guideSteps.tsx): Title Case titles, bodies in two lines, no questions or
// dashes, never "tap" to a desktop player.
export function getWarGuideSteps({ touch }: { touch: boolean }, { down = 3 }: WarGuideInput = {}): GuideStep[] {
  const press = touch ? 'Tap' : 'Click'
  return [
    { title: 'Turn Over a Card', body: `${press} anywhere on your side to turn over your top card.`, art: <PlayArt /> },
    { title: 'Higher Card Wins', body: 'The higher card takes both. Aces are high.', art: <NoArt yes={['K', 'heart']} no={['7', 'spade']} label='A King beats a 7' /> },
    {
      title: 'Ties Mean War',
      body: down === 1 ? 'On a tie, one goes down and one up. The higher takes all.' : 'On a tie, three go down and one up. The higher takes all.',
      art: down === 1 ? <MiniGrid scale={0.6} label='One card face down and one face up' rows={[[['9', 'club'], null, ['Q', 'diamond']]]} /> : <MiniGrid scale={0.6} label='Three cards face down and one face up' rows={[[['9', 'club'], null, null, null, ['Q', 'diamond']]]} />
    }
  ]
}
