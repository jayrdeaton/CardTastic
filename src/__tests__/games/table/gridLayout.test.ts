import { CARD_ASPECT } from '@tastic/cards'

import { gridTableLayout } from '@/games/table/gridLayout'

// A grid table (Six-Card Golf, Trash) in screen coordinates: each player's rows of cards near their own edge, the stock,
// the card in hand and the discard across the middle.

const INSETS = { top: 59, bottom: 34 }
const PHONES: [number, number][] = [
  [402, 874],
  [375, 667],
  [430, 932],
  [360, 640]
]

describe('gridTableLayout', () => {
  it.each(PHONES)('%dx%d: Trash’s two rows of five and Golf’s two rows of three fit, and never touch the middle row', (width, height) => {
    for (const columns of [5, 3]) {
      const layout = gridTableLayout(width, height, INSETS, { columns, rows: 2, upsideDown: false })
      const { cardWidth, cardHeight, slots, held } = layout
      expect(cardWidth / cardHeight).toBeCloseTo(CARD_ASPECT)
      for (const pose of slots[1]) {
        expect(pose.x - cardWidth / 2).toBeGreaterThanOrEqual(0)
        expect(pose.x + cardWidth / 2).toBeLessThanOrEqual(width)
        expect(pose.y + cardHeight / 2).toBeLessThanOrEqual(height - INSETS.bottom)
        // Player 1's cards stay clear of the card in hand.
        expect(pose.y - cardHeight / 2).toBeGreaterThan(held[1].y + cardHeight / 2)
      }
      for (const pose of slots[2]) {
        expect(pose.y - cardHeight / 2).toBeGreaterThanOrEqual(INSETS.top)
        expect(pose.y + cardHeight / 2).toBeLessThan(held[2].y - cardHeight / 2)
      }
    }
  })

  it('face to face, player 2’s side is player 1’s turned round the middle', () => {
    const layout = gridTableLayout(402, 874, INSETS, { columns: 5, rows: 2, upsideDown: true })
    layout.slots[1].forEach((pose, i) => {
      const turned = layout.slots[2][i]
      expect(turned.x).toBeCloseTo(layout.center.x * 2 - pose.x)
      expect(turned.y).toBeCloseTo(layout.center.y * 2 - pose.y)
      expect(turned.rotate).toBe(180)
    })
    expect(layout.held[2].rotate).toBe(180)
  })

  it('against the CPU, player 2’s side reads upright, its first row at the top', () => {
    const layout = gridTableLayout(402, 874, INSETS, { columns: 5, rows: 2, upsideDown: false })
    expect(layout.slots[2][0].x).toBeLessThan(layout.slots[2][4].x)
    expect(layout.slots[2][0].y).toBeLessThan(layout.slots[2][5].y)
    expect(layout.slots[2].every((pose) => pose.rotate === 0)).toBe(true)
  })

  it('the stock and the discard sit either side of the card in hand, clear of the Back and Settings buttons', () => {
    const layout = gridTableLayout(375, 667, INSETS, { columns: 3, rows: 2, upsideDown: false })
    expect(layout.stock.x).toBeLessThan(layout.held[1].x)
    expect(layout.discard.x).toBeGreaterThan(layout.held[1].x)
    expect(layout.stock.x - layout.cardWidth / 2).toBeGreaterThanOrEqual(52)
    expect(layout.discard.x + layout.cardWidth / 2).toBeLessThanOrEqual(375 - 52)
  })
})
