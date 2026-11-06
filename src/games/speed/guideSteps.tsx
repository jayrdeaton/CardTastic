import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

import type { SpeedRefill } from './engine/types'

/** What Speed's cards depend on: whether ranks wrap, and how a hand refills (the player's own settings). */
export interface SpeedGuideInput {
  wrap?: boolean
  refill?: SpeedRefill
}

// Speed's own How to Play, shown on its tile's first tap: what goes on a center pile (and whether ranks wrap), that there
// are no turns, drawing by hand when that's the rule, and what happens when nobody can play. The guide copy rules (constants/guideSteps.tsx): Title Case titles, bodies in two lines,
// no questions or dashes, never "tap" to a desktop player.
export function getSpeedGuideSteps({ touch }: { touch: boolean }, { wrap = true, refill = 'auto' }: SpeedGuideInput = {}): GuideStep[] {
  const press = touch ? 'Tap' : 'Click'
  const steps: GuideStep[] = [
    { title: 'One Up or Down', body: 'Play a card one rank above or below a center pile.', art: <MoveArt from={['8', 'heart']} to={['9', 'spade']} label='An 8 going onto a 9' /> },
    wrap ? { title: 'Ranks Wrap', body: 'A King goes on an Ace, and an Ace on a King or a 2.', art: <MoveArt from={['K', 'diamond']} to={['A', 'club']} label='A King going onto an Ace' /> } : { title: 'Aces Are Low', body: 'An Ace goes only on a 2. Nothing goes between King and Ace.', art: <MoveArt from={['A', 'diamond']} to={['2', 'club']} label='An Ace going onto a 2' /> },
    {
      title: 'No Turns',
      body: `${press} your cards as fast as you can. First out wins.`,
      art: (
        <MiniGrid
          scale={0.6}
          label='A hand of five cards'
          rows={[
            [
              ['3', 'heart'],
              ['10', 'club'],
              ['6', 'diamond'],
              ['Q', 'spade'],
              ['7', 'heart']
            ]
          ]}
        />
      )
    },
    {
      title: 'When Nobody Can Play',
      body: 'New cards turn over onto both center piles.',
      art: <MiniGrid scale={0.6} label='Side piles either side of the center piles' rows={[[null, ['4', 'club'], ['J', 'heart'], null]]} />
    }
  ]
  if (refill === 'tap') steps.splice(3, 0, { title: 'Draw Your Own', body: `${press} your pile to fill an empty spot in your hand.`, art: <MiniGrid scale={0.6} label='A hand with an empty spot, and the draw pile' rows={[[['3', 'heart'], ['10', 'club'], null, ['Q', 'spade']]]} /> })
  return steps
}
