import { getRatSlapGuideSteps } from '@/games/ratslap/guideSteps'

// RatSlap's own How to Play: what a first match needs, under the guide copy rules (constants/guideSteps.tsx).

const ALL_ON = { doubles: true, sandwiches: true, jokers: true }

describe('getRatSlapGuideSteps', () => {
  it('teaches playing, face cards, slapping and the jokers, with every rule on', () => {
    expect(getRatSlapGuideSteps(ALL_ON, { touch: true }).map((s) => s.title)).toEqual(['Tap Your Deck', 'Face Cards', 'Slap the Pile', 'Jokers'])
  })

  it.each([true, false])('touch %s: Title Case titles, two-line bodies, no questions or dashes, and the right verb', (touch) => {
    for (const step of getRatSlapGuideSteps(ALL_ON, { touch })) {
      expect(step.title.split(' ').every((word) => /^[A-Z]/.test(word) || ['a', 'the', 'of', 'to'].includes(word))).toBe(true)
      expect(step.body.length).toBeLessThanOrEqual(62)
      expect(step.body).not.toMatch(/[?\u2013\u2014]/)
      expect(step.body).not.toMatch(touch ? /\bclick/i : /\btap/i)
    }
  })

  it('names only the slaps that are on, and leaves the slap card out with none', () => {
    const slap = (doubles: boolean, sandwiches: boolean) => getRatSlapGuideSteps({ doubles, sandwiches, jokers: false }, { touch: true }).find((s) => s.title === 'Slap the Pile')?.body
    expect(slap(true, true)).toMatch(/a double or a sandwich\.$/)
    expect(slap(true, false)).toMatch(/a double\.$/)
    expect(slap(false, true)).toMatch(/a sandwich\.$/)
    expect(slap(false, false)).toBeUndefined()
  })

  it('leaves the jokers out when they are not in the deck', () => {
    expect(getRatSlapGuideSteps({ ...ALL_ON, jokers: false }, { touch: true }).map((s) => s.title)).not.toContain('Jokers')
  })
})
