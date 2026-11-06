import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

// Speed's own How to Play, shown on its tile's first tap: what goes on a center pile, that there are no turns, and what
// happens when nobody can play. The guide copy rules (constants/guideSteps.tsx): Title Case titles, bodies in two lines,
// no questions or dashes, never "tap" to a desktop player.
export function getSpeedGuideSteps({ touch }: { touch: boolean }): GuideStep[] {
  const press = touch ? 'Tap' : 'Click'
  return [
    { title: 'One Up or Down', body: 'Play a card one rank above or below a center pile.', art: <MoveArt from={['8', 'heart']} to={['9', 'spade']} label='An 8 going onto a 9' /> },
    { title: 'Ranks Wrap', body: 'A King goes on an Ace, and an Ace on a King or a 2.', art: <MoveArt from={['K', 'diamond']} to={['A', 'club']} label='A King going onto an Ace' /> },
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
}
