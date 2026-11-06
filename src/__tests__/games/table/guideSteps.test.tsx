import type { GuideStep } from '@tastic/hud/guide'

import { getEightsGuideSteps } from '@/games/crazyeights/guideSteps'
import { getCrownsGuideSteps } from '@/games/fourcrowns/guideSteps'
import { getGinGuideSteps } from '@/games/ginrummy/guideSteps'
import { getSixCardGolfGuideSteps } from '@/games/sixcardgolf/guideSteps'
import { getSlapjackGuideSteps } from '@/games/slapjack/guideSteps'
import { getSpeedGuideSteps } from '@/games/speed/guideSteps'
import { getTrashGuideSteps } from '@/games/trash/guideSteps'
import { getWarGuideSteps } from '@/games/war/guideSteps'

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

  it('says what a wrong slap costs under the penalty picked', () => {
    expect(getSlapjackGuideSteps({ touch: true }, { penalty: 'give' })[2].body).toMatch(/gives your top card/)
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    expectCopyRules(getSlapjackGuideSteps({ touch }), touch)
    expectCopyRules(getSlapjackGuideSteps({ touch }, { penalty: 'give' }), touch)
  })
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

  it('names the wild picked', () => {
    expect(getTrashGuideSteps({ cards: 10, wild: 'kings' })[2].title).toBe('Kings Are Wild')
  })

  it('follows the copy rules', () => {
    expectCopyRules(getTrashGuideSteps({ cards: 10 }), true)
    expectCopyRules(getTrashGuideSteps({ cards: 5 }), false)
    expectCopyRules(getTrashGuideSteps({ cards: 10, wild: 'kings' }), true)
  })
})

describe('War', () => {
  it('teaches turning a card over, the higher card, and a war', () => {
    expect(getWarGuideSteps({ touch: true }).map((s) => s.title)).toEqual(['Turn Over a Card', 'Higher Card Wins', 'Ties Mean War'])
  })

  it('says how many go down in a war under the rule picked', () => {
    expect(getWarGuideSteps({ touch: true }, { down: 1 })[2].body).toMatch(/one goes down/)
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    expectCopyRules(getWarGuideSteps({ touch }), touch)
    expectCopyRules(getWarGuideSteps({ touch }, { down: 1 }), touch)
  })
})

describe('Speed', () => {
  it('teaches what fits, the wrap, no turns, and the side piles', () => {
    expect(getSpeedGuideSteps({ touch: true }).map((s) => s.title)).toEqual(['One Up or Down', 'Ranks Wrap', 'No Turns', 'When Nobody Can Play'])
  })

  it('follows the rules picked: no wrap, and drawing by hand', () => {
    expect(getSpeedGuideSteps({ touch: true }, { wrap: false }).map((s) => s.title)).toEqual(['One Up or Down', 'Aces Are Low', 'No Turns', 'When Nobody Can Play'])
    expect(getSpeedGuideSteps({ touch: false }, { refill: 'tap' }).map((s) => s.title)).toEqual(['One Up or Down', 'Ranks Wrap', 'No Turns', 'Draw Your Own', 'When Nobody Can Play'])
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    expectCopyRules(getSpeedGuideSteps({ touch }), touch)
    expectCopyRules(getSpeedGuideSteps({ touch }, { wrap: false, refill: 'tap' }), touch)
  })
})

describe('Gin Rummy', () => {
  it('teaches melds, a turn, knocking, gin and the match’s target, and passing the phone', () => {
    expect(getGinGuideSteps({ target: 100 }, { touch: true }).map((s) => s.title)).toEqual(['Make Melds', 'Draw, Then Throw', 'Knock to End the Hand', 'Go Gin', 'Pass the Phone'])
    expect(getGinGuideSteps({ target: 50 }, { touch: true })[3].body).toMatch(/First to 50 wins\.$/)
    expect(getGinGuideSteps({ target: 100 }, { touch: false })[4].body).toMatch(/click Ready/)
  })

  it('follows the rules picked: the knock rule, the bonuses and a one-hand match', () => {
    expect(getGinGuideSteps({ target: 100, knock: 'ginOnly' }, { touch: true })[2].title).toBe('Gin Ends the Hand')
    expect(getGinGuideSteps({ target: 100, knock: 'oklahoma' }, { touch: true })[2].body).toMatch(/upcard/)
    expect(getGinGuideSteps({ target: 1, bonus: 'hoyle' }, { touch: true })[3].body).toBe('Meld every card for gin, worth 20 more. One hand wins.')
    expect(getGinGuideSteps({ target: 100, bonus: 'bigGin' }, { touch: true }).map((s) => s.title)).toEqual(['Make Melds', 'Draw, Then Throw', 'Knock to End the Hand', 'Go Gin', 'Big Gin', 'Pass the Phone'])
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    expectCopyRules(getGinGuideSteps({ target: 100 }, { touch }), touch)
    expectCopyRules(getGinGuideSteps({ target: 50 }, { touch }), touch)
    expectCopyRules(getGinGuideSteps({ target: 1, knock: 'oklahoma', bonus: 'bigGin' }, { touch }), touch)
    expectCopyRules(getGinGuideSteps({ target: 100, knock: 'ginOnly', bonus: 'hoyle' }, { touch }), touch)
  })
})

describe('Four Crowns', () => {
  it('teaches melds, the wild that changes, a turn, going out, scoring, and passing the phone', () => {
    expect(getCrownsGuideSteps({ touch: true }).map((s) => s.title)).toEqual(['Make Melds', 'A New Wild Each Round', 'Draw, Then Throw', 'Go Out', 'Lowest Total Wins', 'Pass the Phone'])
    expect(getCrownsGuideSteps({ touch: false })[5].body).toMatch(/click Ready/)
  })

  it('follows the rules picked: jokers, and no last turns', () => {
    expect(getCrownsGuideSteps({ touch: true }, { jokers: true })[1].body).toMatch(/jokers are wild/)
    expect(getCrownsGuideSteps({ touch: true }, { lastTurns: 'none' })[3].body).toMatch(/The round ends\.$/)
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    expectCopyRules(getCrownsGuideSteps({ touch }), touch)
    expectCopyRules(getCrownsGuideSteps({ touch }, { jokers: true, lastTurns: 'none' }), touch)
  })
})

describe('Crazy Eights', () => {
  it('teaches matching, the wild 8s, what to do when nothing fits, winning, and passing the phone', () => {
    expect(getEightsGuideSteps({ touch: true }).map((s) => s.title)).toEqual(['Match the Pile', 'Eights Are Wild', 'Nothing Fits', 'First Out Wins', 'Pass the Phone'])
    expect(getEightsGuideSteps({ touch: false })[4].body).toMatch(/click Ready/)
  })

  it('follows the rules picked: the draw rule and the special cards', () => {
    expect(getEightsGuideSteps({ touch: true }, { draw: 'one' })[2].body).toMatch(/Draw one card/)
    expect(getEightsGuideSteps({ touch: true }, { specials: 'twos' }).map((s) => s.title)).toContain('Twos Draw Two')
    expect(getEightsGuideSteps({ touch: true }, { specials: 'action' }).map((s) => s.title)).toEqual(['Match the Pile', 'Eights Are Wild', 'Nothing Fits', 'Action Cards', 'Aces Turn It Around', 'First Out Wins', 'Pass the Phone'])
  })

  it.each([true, false])('touch %s: follows the copy rules', (touch) => {
    for (const draw of ['untilPlayable', 'one', 'three'] as const) for (const specials of ['eights', 'twos', 'action'] as const) expectCopyRules(getEightsGuideSteps({ touch }, { draw, specials }), touch)
  })
})
