import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

/** What Gin Rummy's cards depend on: the score a match plays to (the player's own setting). */
export interface GinGuideInput {
  target: number
}

// Gin Rummy's own How to Play, shown on its tile's first tap: what a meld is, how a turn goes, when to knock, what gin
// is worth, and how two people share the phone. The guide copy rules (constants/guideSteps.tsx): Title Case titles,
// bodies in two lines, no questions or dashes, never "tap" to a desktop player.
export function getGinGuideSteps({ target }: GinGuideInput, { touch }: { touch: boolean }): GuideStep[] {
  const press = touch ? 'tap' : 'click'
  return [
    {
      title: 'Make Melds',
      body: 'Three or four of a kind, or three or more in a suit in a row.',
      art: (
        <MiniGrid
          scale={0.6}
          label='Three 7s, and the 4, 5 and 6 of hearts'
          rows={[
            [
              ['7', 'club'],
              ['7', 'diamond'],
              ['7', 'spade']
            ],
            [
              ['4', 'heart'],
              ['5', 'heart'],
              ['6', 'heart']
            ]
          ]}
        />
      )
    },
    { title: 'Draw, Then Throw', body: 'Draw from the stock or the discard, then throw a card.', art: <MoveArt from={['K', 'spade']} to={['9', 'diamond']} label='A King thrown onto the discard' /> },
    {
      title: 'Knock to End the Hand',
      body: 'Knock once your cards left out of melds add up to 10 or less.',
      art: (
        <MiniGrid
          scale={0.6}
          label='Melds and a 3 left over'
          rows={[
            [
              ['8', 'club'],
              ['8', 'diamond'],
              ['8', 'heart'],
              ['3', 'spade']
            ]
          ]}
        />
      )
    },
    {
      title: 'Go Gin',
      body: `Meld every card for gin, worth 25 more. First to ${target} wins.`,
      art: (
        <MiniGrid
          scale={0.6}
          label='Every card melded'
          rows={[
            [
              ['9', 'heart'],
              ['10', 'heart'],
              ['J', 'heart'],
              ['Q', 'heart']
            ]
          ]}
        />
      )
    },
    { title: 'Pass the Phone', body: `With two players, your hand hides until you ${press} Ready.`, art: <MiniGrid scale={0.6} label='A hand face down' rows={[[null, null, null, null, null]]} /> }
  ]
}
