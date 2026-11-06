import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

import { type EightsDrawRule, type EightsSpecials } from './engine/types'

/** What Crazy Eights' cards depend on: the player's own rules (what to do when nothing fits, and the special cards). */
export interface EightsGuideInput {
  draw?: EightsDrawRule
  specials?: EightsSpecials
}

const DRAW_BODIES: Record<EightsDrawRule, string> = {
  untilPlayable: 'Draw from the stock until a card fits, then play it.',
  one: 'Draw one card. If it fits, play it. If not, your turn passes.',
  three: 'Draw up to three cards until one fits, or your turn passes.'
}

// Crazy Eights' own How to Play, shown on its tile's first tap: matching the pile, the wild 8s, what to do when nothing
// fits (as the player's rules have it), the special cards when they're on, winning, and how people share the phone. The
// guide copy rules (constants/guideSteps.tsx): Title Case titles, bodies in two lines, no questions or dashes, never
// "tap" to a desktop player.
export function getEightsGuideSteps({ touch }: { touch: boolean }, { draw = 'untilPlayable', specials = 'eights' }: EightsGuideInput = {}): GuideStep[] {
  const press = touch ? 'tap' : 'click'
  const steps: GuideStep[] = [
    { title: 'Match the Pile', body: 'Play a card of the same suit or rank as the top card.', art: <MoveArt from={['7', 'heart']} to={['9', 'heart']} label='A 7 of hearts played on the 9 of hearts' /> },
    { title: 'Eights Are Wild', body: 'An 8 goes on anything, and you name the next suit.', art: <MiniGrid scale={0.6} label='An 8 of spades, wild' rows={[[['8', 'spade']]]} marks={[{ row: 0, column: 0, text: 'Wild' }]} /> },
    { title: 'Nothing Fits', body: DRAW_BODIES[draw], art: <MiniGrid scale={0.6} label='The stock, face down' rows={[[null, null, null]]} /> }
  ]
  if (specials === 'twos') steps.push({ title: 'Twos Draw Two', body: 'A 2 makes the next player draw two and miss a turn.', art: <MiniGrid scale={0.6} label='A 2 of clubs' rows={[[['2', 'club']]]} /> })
  if (specials === 'action')
    steps.push({
      title: 'Action Cards',
      body: 'A 2 makes the next player draw two, a Queen skips them.',
      art: (
        <MiniGrid
          scale={0.6}
          label='A 2 and a Queen'
          rows={[
            [
              ['2', 'club'],
              ['Q', 'diamond']
            ]
          ]}
        />
      )
    })
  if (specials === 'action') steps.push({ title: 'Aces Turn It Around', body: 'An Ace sends play the other way round the table.', art: <MiniGrid scale={0.6} label='An Ace of hearts' rows={[[['A', 'heart']]]} /> })
  steps.push({ title: 'First Out Wins', body: 'Play your last card to win the game.', art: <MiniGrid scale={0.6} label='One card left' rows={[[['5', 'diamond']]]} /> })
  steps.push({ title: 'Pass the Phone', body: `Sharing a phone, your hand hides until you ${press} Ready.`, art: <MiniGrid scale={0.6} label='A hand face down' rows={[[null, null, null, null, null]]} /> })
  return steps
}
