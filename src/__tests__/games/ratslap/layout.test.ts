import { CARD_ASPECT, faceUpFanOffset, RANK_INK_RIGHT_FRACTION } from '@tastic/cards'

import { burnedPose, DECK_LABEL_ROOM, halfAt, inRect, PILE_DRAWN, pileCardPose, pileTilt, slapArea, tableLayout } from '@/games/ratslap/layout'

// RatSlap's table in screen coordinates: a deck near each short edge, the pile between them.

describe('tableLayout', () => {
  it.each([
    [402, 874, { top: 62, bottom: 34 }],
    [375, 667, { top: 20, bottom: 0 }],
    [430, 932, { top: 59, bottom: 34 }],
    [1280, 800, { top: 0, bottom: 0 }]
  ])('%ix%i: decks inside the safe area, clear of the pile, cards at the deck proportions', (width, height, insets) => {
    const layout = tableLayout(width, height, insets)
    expect(layout.cardHeight).toBeCloseTo(layout.cardWidth / CARD_ASPECT, 0)
    expect(layout.decks[2].y - layout.cardHeight / 2).toBeGreaterThanOrEqual(insets.top)
    expect(layout.decks[1].y + layout.cardHeight / 2).toBeLessThanOrEqual(height - insets.bottom)
    // A pile card never reaches a deck.
    expect(layout.decks[1].y - layout.cardHeight / 2).toBeGreaterThan(layout.center.y + layout.cardHeight / 2 + 12)
    expect(layout.decks[2].y + layout.cardHeight / 2).toBeLessThan(layout.center.y - layout.cardHeight / 2 - 12)
  })

  it('a tap on or just around a deck plays; elsewhere in the half it is a slap', () => {
    const layout = tableLayout(402, 874, { top: 62, bottom: 34 })
    const deck = layout.decks[1]
    expect(inRect(deck, layout.deckTargets[1])).toBe(true)
    expect(inRect({ x: deck.x + layout.cardWidth / 2 + 10, y: deck.y }, layout.deckTargets[1])).toBe(true)
    expect(inRect(layout.center, layout.deckTargets[1])).toBe(false)
    expect(halfAt({ x: 10, y: layout.center.y + 1 }, layout)).toBe(1)
    expect(halfAt({ x: 10, y: layout.center.y - 1 }, layout)).toBe(2)
  })
})

describe('the pile', () => {
  const SIZES: [number, number, { top: number; bottom: number }][] = [
    [320, 568, { top: 20, bottom: 0 }],
    [360, 640, { top: 24, bottom: 0 }],
    [375, 667, { top: 20, bottom: 0 }],
    [402, 874, { top: 62, bottom: 34 }],
    [1280, 800, { top: 0, bottom: 0 }]
  ]

  it.each(SIZES)('%ix%i: the top three fan out with every rank whole, clear of the Home and Settings buttons', (width, height, insets) => {
    const layout = tableLayout(width, height, insets)
    const poses = [0, 1, 2].map((depth) => pileCardPose(layout, depth, 10, 'hearts-7'))
    // Newest on the right; each card under it shows its rank (the widest, a '10', ends at RANK_INK_RIGHT_FRACTION),
    // with room for both cards' tilt.
    expect(poses[0].x - poses[1].x).toBe(layout.pileStep)
    expect(poses[1].x - poses[2].x).toBe(layout.pileStep)
    expect(layout.pileStep).toBeGreaterThanOrEqual(layout.cardWidth * RANK_INK_RIGHT_FRACTION + 6)
    // Centered, and inside the side buttons (an IconButton and its margins, 56 points in from each edge).
    expect((poses[0].x + poses[2].x) / 2).toBeCloseTo(layout.center.x)
    expect(poses[2].x - layout.cardWidth / 2).toBeGreaterThanOrEqual(56)
    expect(poses[0].x + layout.cardWidth / 2).toBeLessThanOrEqual(width - 56)
  })

  it('cards under the fan lie square under its last card, so one dropping off the bottom is never seen', () => {
    const layout = tableLayout(402, 874, { top: 62, bottom: 34 })
    const last = pileCardPose(layout, 2, 10, 'clubs-2')
    expect(pileCardPose(layout, 3, 10, 'spades-9')).toEqual({ x: last.x, y: last.y, rotate: 0 })
    expect(pileCardPose(layout, PILE_DRAWN, 10, 'hearts-4')).toEqual(pileCardPose(layout, 3, 10, 'spades-9'))
  })

  it('a short pile spreads from the middle', () => {
    const layout = tableLayout(402, 874, { top: 62, bottom: 34 })
    expect(pileCardPose(layout, 0, 1, 'hearts-7').x).toBe(layout.center.x)
    expect(pileCardPose(layout, 0, 2, 'hearts-7').x).toBe(layout.center.x + layout.pileStep / 2)
    expect(pileCardPose(layout, 1, 2, 'hearts-8').x).toBe(layout.center.x - layout.pileStep / 2)
  })

  it.each(SIZES)('%ix%i: a burned card lies under the bottom of the pile, its corner row above it, clear of the top deck', (width, height, insets) => {
    const layout = tableLayout(width, height, insets)
    const burned = burnedPose(layout, 10)
    expect(burned.x).toBe(pileCardPose(layout, 2, 10, 'hearts-7').x)
    expect(layout.burnedLift).toBeGreaterThanOrEqual(faceUpFanOffset(layout.cardWidth))
    expect(layout.decks[2].y + layout.cardHeight / 2 + DECK_LABEL_ROOM).toBeLessThan(burned.y - layout.cardHeight / 2)
  })

  it('pileTilt is the same every time for a card, small, and not the same for every card', () => {
    expect(pileTilt('hearts-7-0')).toBe(pileTilt('hearts-7-0'))
    const ids = ['hearts-7-0', 'spades-1-0', 'joker-1', 'clubs-13-0', 'diamonds-4-0', 'hearts-11-0']
    for (const id of ids) expect(Math.abs(pileTilt(id))).toBeLessThanOrEqual(2.5)
    expect(new Set(ids.map(pileTilt)).size).toBeGreaterThan(2)
  })
})

describe('slapArea', () => {
  it('is the felt between the pile and each deck, with room for the slap line on a phone', () => {
    const layout = tableLayout(375, 667, { top: 20, bottom: 0 })
    const bottom = slapArea(layout, 1)
    expect(bottom.y).toBeGreaterThan(layout.center.y + layout.cardHeight / 2)
    expect(bottom.y).toBeLessThan(layout.decks[1].y - layout.cardHeight / 2)
    expect(bottom.height).toBeGreaterThanOrEqual(28)
    const top = slapArea(layout, 2)
    expect(top.y).toBeLessThan(layout.center.y - layout.cardHeight / 2 - layout.burnedLift)
    expect(top.y).toBeGreaterThan(layout.decks[2].y + layout.cardHeight / 2)
  })
})
