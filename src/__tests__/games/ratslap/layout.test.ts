import { CARD_ASPECT } from '@tastic/cards'

import { halfAt, inRect, pileTilt, tableLayout } from '@/games/ratslap/layout'

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
    // A pile card (tilted, nudged) never reaches a deck.
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

describe('pileTilt', () => {
  it('is the same every time for a card, and small', () => {
    expect(pileTilt('hearts-7-0')).toEqual(pileTilt('hearts-7-0'))
    for (const id of ['hearts-7-0', 'spades-1-0', 'joker-1', 'clubs-13-0']) {
      const tilt = pileTilt(id)
      expect(Math.abs(tilt.rotate)).toBeLessThanOrEqual(14)
      expect(Math.abs(tilt.dx)).toBeLessThanOrEqual(6)
      expect(Math.abs(tilt.dy)).toBeLessThanOrEqual(6)
    }
  })

  it('turns different cards differently', () => {
    const angles = new Set(['hearts-7-0', 'spades-1-0', 'clubs-13-0', 'diamonds-4-0', 'hearts-11-0'].map((id) => pileTilt(id).rotate))
    expect(angles.size).toBeGreaterThan(2)
  })
})
