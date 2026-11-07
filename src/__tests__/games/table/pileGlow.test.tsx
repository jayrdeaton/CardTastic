import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { TableView } from '@/games/table/TableView'

// The table games' "your move" mark (Jay, 2026-11-07): a breathing halo under each card or pile a player can tap, in place
// of an outline round the top card, which cut across a stack's under-cards. Drawn before the cards, so it shows only round
// them; one per glowing card, none for a hand card that's picked rather than played (`glow: false`).
jest.mock('@/components/theme', () => ({ ...jest.requireActual('@/components/theme'), useTableColors: () => ({ hintGreen: '#123456' }) }))
jest.mock('@/games/table/TableCards', () => {
  const { View: RNView } = require('react-native')
  return { TableCards: () => <RNView testID='cards' /> }
})
jest.mock('@/games/table/TableChrome', () => ({ ...jest.requireActual('@/games/table/TableChrome'), TableSideButtons: () => null, SeatBadge: () => null }))

const LAYOUT = {
  cardWidth: 60,
  cardHeight: 84,
  center: { x: 200, y: 400 },
  labelY: { 1: 800, 2: 20 },
  promptY: { 1: 760, 2: 60 },
  notes: { 1: { x: 200, y: 460, rotate: 0 }, 2: { x: 200, y: 340, rotate: 180 } },
  upsideDown: false
}

async function renderTable(extra: Partial<React.ComponentProps<typeof TableView>> = {}) {
  await render(<TableView game='g' layout={LAYOUT} cards={[]} dealKey={0} labels={{}} prompts={{}} notes={{}} call={null} emptySlots={[]} onSettings={jest.fn()} {...extra} />)
}

/** The testIDs of the table's top-level pieces, in drawing order. */
function drawingOrder(): string[] {
  const root = screen.toJSON() as unknown as { children: { props: { testID?: string } }[] }
  return root.children.map((child) => child.props.testID ?? '')
}

describe('PileGlow on a card table', () => {
  it('glows under each card that can be tapped, and under each card it is told to, but not a picked hand card', async () => {
    await renderTable({
      targets: [
        { key: 'stock', at: { x: 120, y: 400 }, label: 'Draw', onPress: jest.fn() },
        { key: 'card', at: { x: 200, y: 700 }, label: 'Pick', onPress: jest.fn(), glow: false }
      ],
      glows: [{ x: 280, y: 400 }]
    })
    const glows = screen.getAllByTestId('g-glow').map((glow) => StyleSheet.flatten(glow.props.style))
    expect(glows.map((style) => [style.left, style.top])).toEqual([
      [90, 358],
      [250, 358]
    ])
    for (const style of glows) {
      expect(style).toEqual(expect.objectContaining({ height: 84, width: 60 }))
      expect(style.boxShadow).toContain('#123456')
      expect(style.borderWidth ?? 0).toBe(0)
    }
  })

  it('draws the glows before the cards, so the cards cover all but the halo', async () => {
    await renderTable({ glows: [{ x: 280, y: 400 }] })
    const order = drawingOrder()
    expect(order.indexOf('g-glow')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('g-glow')).toBeLessThan(order.indexOf('cards'))
  })

  it('draws no glow when nothing is to be tapped', async () => {
    await renderTable()
    expect(screen.queryAllByTestId('g-glow')).toHaveLength(0)
  })
})
