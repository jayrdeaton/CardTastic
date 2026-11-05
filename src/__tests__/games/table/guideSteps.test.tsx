import type { GuideStep } from '@tastic/hud/guide'

import { getSixCardGolfGuideSteps } from '@/games/sixcardgolf/guideSteps'
import { getSlapjackGuideSteps } from '@/games/slapjack/guideSteps'
import { getTrashGuideSteps } from '@/games/trash/guideSteps'

// The two-player games' own How to Play cards, under the guide copy rules (constants/guideSteps.tsx): Title Case titles
// (minor words and numbers aside), two-line bodies, no questions or dashes, and never "tap" to a desktop player.

const MINOR = ['a', 'an', 'and', 'or', 'the', 'of', 'to']

function expectCopyRules(steps: GuideStep[], touch: boolean) {
  for (const step of steps) {
    expect(step.title.split(' ').every((word) => /^[A-Z0-9]/.test(word) || MINOR.includes(word))).toBe(true)
    expect(step.body.length).toBeLessThanOrEqual(62)
    expect(step.body).not.toMatch(/[?\u2013\u2014]/)
    expect(step.body).not.toMatch(touch ? /\bclick/i : /\btap/i)
    expect(step.art).toBeDefined()
  }
}

describe('Slapjack', () => {
  it('teaches playing, slapping a Jack and what a wrong slap costs', () => {
    expect(getSlapjackGuideSteps({ touch: true }).map((s) => s.title)).toEqual(['Tap Your Deck', 'Slap a Jack', 'Wrong Slaps Cost'])
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => expectCopyRules(getSlapjackGuideSteps({ touch }), touch))
})

describe('Six-Card Golf', () => {
  it('teaches the opening flips, a turn, and what scores low', () => {
    expect(getSixCardGolfGuideSteps().map((s) => s.title)).toEqual(['Turn Up Two', 'Draw or Take', 'Swap to Score Low', 'Pairs Score Zero'])
  })

  it('follows the copy rules', () => {
    expectCopyRules(getSixCardGolfGuideSteps(), true)
    expectCopyRules(getSixCardGolfGuideSteps(), false)
  })
})

describe('Trash', () => {
  it('names the spots the match starts with', () => {
    expect(getTrashGuideSteps({ cards: 10 })[0].body).toMatch(/up to 10\.$/)
    expect(getTrashGuideSteps({ cards: 5 })[0].title).toBe('Ace to 5')
  })

  it('teaches the spots, playing on, the wild Jacks and winning rounds', () => {
    expect(getTrashGuideSteps({ cards: 10 }).map((s) => s.title)).toEqual(['Ace to 10', 'Keep Going', 'Jacks Are Wild', 'One Fewer Each Win'])
  })

  it('follows the copy rules', () => {
    expectCopyRules(getTrashGuideSteps({ cards: 10 }), true)
    expectCopyRules(getTrashGuideSteps({ cards: 5 }), false)
  })
})
