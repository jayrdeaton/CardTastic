import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

import { GIN_BONUSES, type GinBonusRule, type GinKnockRule } from './engine/types'

/** What Gin Rummy's cards depend on: the player's own rules (the score a match plays to, when to knock, the bonuses). */
export interface GinGuideInput {
  target: number
  knock?: GinKnockRule
  bonus?: GinBonusRule
}

// Gin Rummy's own How to Play, shown on its tile's first tap: what a meld is, how a turn goes, when to knock (as the
// player's rules have it), what gin is worth (and Big Gin, when it's on), and how two people share the phone. The guide copy rules (constants/guideSteps.tsx): Title Case titles,
// bodies in two lines, no questions or dashes, never "tap" to a desktop player.
export function getGinGuideSteps({ target, knock = 'ten', bonus = 'standard' }: GinGuideInput, { touch }: { touch: boolean }): GuideStep[] {
  const press = touch ? 'tap' : 'click'
  const bonuses = GIN_BONUSES[bonus]
  const knockCard = knock === 'ginOnly' ? { title: 'Gin Ends the Hand', body: 'No knocking here: a hand ends when someone melds every card.' } : knock === 'oklahoma' ? { title: 'Knock to End the Hand', body: 'The first upcard sets the knock limit. A spade doubles.' } : { title: 'Knock to End the Hand', body: 'Knock once your cards left out of melds add up to 10 or less.' }
  const steps: GuideStep[] = [
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
      ...knockCard,
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
      body: `Meld every card for gin, worth ${bonuses.gin} more. ${target === 1 ? 'One hand wins.' : `First to ${target} wins.`}`,
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
  if (bonuses.bigGin !== null)
    steps.splice(4, 0, {
      title: 'Big Gin',
      body: `All eleven melded right after a draw is Big Gin: ${bonuses.bigGin} more.`,
      art: (
        <MiniGrid
          scale={0.6}
          label='Eleven cards melded'
          rows={[
            [
              ['2', 'club'],
              ['3', 'club'],
              ['4', 'club'],
              ['5', 'club']
            ],
            [
              ['K', 'heart'],
              ['K', 'spade'],
              ['K', 'diamond']
            ]
          ]}
        />
      )
    })
  return steps
}
