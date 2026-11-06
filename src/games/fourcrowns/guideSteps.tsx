import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

import { type CrownsLastTurns } from './engine/types'

// Four Crowns' own How to Play, shown on its tile's first tap: what a meld is, the wild that changes every round, how a
// turn goes, going out, what scores against you, and how people share the phone. The guide copy rules
// (constants/guideSteps.tsx): Title Case titles, bodies in two lines, no questions or dashes, never "tap" to a desktop
// player.
/** What Four Crowns' cards depend on: the player's own rules (jokers in the deck, and a last turn after going out). */
export interface CrownsGuideInput {
  jokers?: boolean
  lastTurns?: CrownsLastTurns
}

export function getCrownsGuideSteps({ touch }: { touch: boolean }, { jokers = false, lastTurns = 'everyone' }: CrownsGuideInput = {}): GuideStep[] {
  const press = touch ? 'tap' : 'click'
  return [
    {
      title: 'Make Melds',
      body: 'Three or more of a kind, or three or more in a suit in a row.',
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
    {
      title: 'A New Wild Each Round',
      body: jokers ? 'Rounds deal 3 cards up to 13. That rank and jokers are wild.' : 'Rounds deal 3 cards up to 13. The rank dealt is wild.',
      art: (
        <MiniGrid
          scale={0.6}
          label='Fives wild: a 5 filling the 5 of hearts in a run'
          rows={[
            [
              ['4', 'heart'],
              ['5', 'club'],
              ['6', 'heart']
            ]
          ]}
          marks={[{ row: 0, column: 1, text: 'Wild' }]}
        />
      )
    },
    { title: 'Draw, Then Throw', body: 'Draw from the stock or the discard, then throw a card.', art: <MoveArt from={['K', 'spade']} to={['9', 'diamond']} label='A King thrown onto the discard' /> },
    {
      title: 'Go Out',
      body: lastTurns === 'everyone' ? 'Meld every card but your throw to go out. Then one last turn.' : 'Meld every card but your throw to go out. The round ends.',
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
    {
      title: 'Lowest Total Wins',
      body: jokers ? 'Cards left over count against you: a wild 20, a joker 50.' : 'Cards left over count against you. A wild left counts 20.',
      art: (
        <MiniGrid
          scale={0.6}
          label='A King and a 2 left over'
          rows={[
            [
              ['K', 'club'],
              ['2', 'diamond']
            ]
          ]}
        />
      )
    },
    { title: 'Pass the Phone', body: `Sharing a phone, your hand hides until you ${press} Ready.`, art: <MiniGrid scale={0.6} label='A hand face down' rows={[[null, null, null, null, null]]} /> }
  ]
}
