import type { GuideStep } from '@tastic/hud/guide'

import { PlayArt, SlapArt } from '@/games/ratslap/guideSteps'

// Slapjack's own How to Play, shown on its tile's first tap: how to play a card, when to slap, and what a wrong slap
// costs. The Rules sheet has the rest (slapping back in). The guide copy rules (constants/guideSteps.tsx): Title Case
// titles, bodies in two lines, never "tap" to a desktop player.
export function getSlapjackGuideSteps({ touch }: { touch: boolean }): GuideStep[] {
  const press = touch ? 'Tap' : 'Click'
  return [
    { title: `${press} Your Deck`, body: `${press} your deck to play your top card onto the pile.`, art: <PlayArt /> },
    { title: 'Slap a Jack', body: `${press} anywhere on your side when a Jack is on top.`, art: <SlapArt under={['4', 'club']} top={['J', 'heart']} label='A Jack on the pile, slapped' /> },
    { title: 'Wrong Slaps Cost', body: 'A wrong slap puts your top card under the pile.', art: <SlapArt under={['4', 'club']} top={['Q', 'spade']} label='A Queen on the pile, slapped by mistake' wrong /> }
  ]
}
