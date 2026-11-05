import type { GuideStep } from '@tastic/hud/guide'

import { MiniGrid, MoveArt } from '@/games/table/guideArt'

// Six-Card Golf's own How to Play, shown on its tile's first tap: the opening flips, a turn, and what scores low. The
// Rules sheet has the card values and the last turn. The guide copy rules (constants/guideSteps.tsx): Title Case
// titles, bodies in two lines, no questions or dashes.
export function getSixCardGolfGuideSteps(): GuideStep[] {
  return [
    {
      title: 'Turn Up Two',
      body: 'Start by turning two of your six cards face up.',
      art: (
        <MiniGrid
          scale={0.55}
          label='Six cards, two of them face up'
          rows={[
            [['4', 'heart'], null, null],
            [null, null, ['K', 'spade']]
          ]}
        />
      )
    },
    { title: 'Draw or Take', body: 'Draw from the stock, or take the top card of the discard.', art: <MoveArt from={null} to={['3', 'diamond']} label='A card drawn from the stock' /> },
    { title: 'Swap to Score Low', body: 'Swap it for one of your cards. The lowest score wins.', art: <MoveArt from={['3', 'diamond']} to={['Q', 'club']} label='A 3 swapped in for a Queen' /> },
    {
      title: 'Pairs Score Zero',
      body: 'Two of a rank in a column score nothing at all.',
      art: (
        <MiniGrid
          scale={0.55}
          label='Two eights in a column score zero'
          marks={[{ row: 0, column: 1, text: '0' }]}
          rows={[
            [
              ['4', 'heart'],
              ['8', 'spade'],
              ['K', 'club']
            ],
            [null, ['8', 'heart'], ['2', 'diamond']]
          ]}
        />
      )
    }
  ]
}
