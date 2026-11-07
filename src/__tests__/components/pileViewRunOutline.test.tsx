import { CARD_ASPECT, CardSizeProvider, faceUpFanOffset } from '@tastic/cards'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { PileView } from '@/components/PileView'
import type { Card } from '@/engine/types'

// A hinted run, or a single hinted card, glows UNDER the column's cards (HintGlow in the run's box, drawn before every card;
// Jay, 2026-11-07: a glow, not a ring), so the halo shows round the run and never over the card above it. A selected RUN
// is drawn with one ring around the whole run (RunOutline), over the cards, not a ring on every card: per-card rings drew a
// ladder of lines across the run.

const mockRings: Record<string, { hinted: boolean; selected: boolean }> = {}
const mockGhost = { cardRegistry: { register: jest.fn(), unregister: jest.fn() }, showLive: jest.fn() }

jest.mock('@/components/PlayingCard', () => {
  const { View } = require('react-native')
  return {
    PlayingCard: ({ card, hinted, selected }: { card: { id: string }; hinted?: boolean; selected?: boolean }) => {
      mockRings[card.id] = { hinted: !!hinted, selected: !!selected }
      return <View testID={`card-${card.id}`} />
    },
    RunOutline: () => <View testID='outline-selected' />,
    EmptySlot: () => <View />
  }
})
jest.mock('@/components/hintGlow', () => {
  const { View } = require('react-native')
  return { ...jest.requireActual('@/components/hintGlow'), HintGlow: () => <View testID='hint-glow' /> }
})
jest.mock('@/components/dragdrop/DragGhostLayer', () => ({ useDragGhost: () => mockGhost }))
jest.mock('@/components/useCardSounds', () => ({ useCardSoundEffects: () => ({ playCardSound: jest.fn() }) }))
jest.mock('react-native-reanimated', () => {
  const { useRef } = require('react')
  const base = jest.requireActual('../../__mocks__/react-native-reanimated')
  return { ...base, useSharedValue: (initial: unknown) => useRef({ value: initial }).current, useAnimatedRef: () => useRef({ current: null }).current }
})
jest.mock('react-native-gesture-handler', () => {
  const pan = () => {
    const g: Record<string, unknown> = {}
    for (const method of ['minDistance', 'onStart', 'onUpdate', 'onEnd', 'enabled']) g[method] = () => g
    return g
  }
  return { Gesture: { Pan: pan }, GestureDetector: ({ children }: { children: unknown }) => children }
})

const card = (rank: number): Card => ({ id: `spades-${rank}-0`, suit: 'spades', rank, faceUp: true }) as Card
const CARDS = [card(9), card(8), card(7), card(6), card(5)]
const drag = { registry: { hitTest: async () => null }, getRunCount: () => 1, onDrop: async () => false } as never
const CARD_WIDTH = 64

function pile(props: Partial<React.ComponentProps<typeof PileView>> = {}) {
  return (
    <CardSizeProvider width={CARD_WIDTH}>
      <PileView cards={CARDS} drag={drag} onPressCard={() => {}} {...props} />
    </CardSizeProvider>
  )
}

/** The box a mark fills: its parent (PileView's positioned wrapper). */
function markBox(testID: string) {
  const mark = screen.getByTestId(testID)
  return StyleSheet.flatten(mark.parent?.props.style) as { top: number; height: number; width: number; zIndex?: number }
}

/** Every testID in the rendered tree, in drawing order (depth first). */
function drawingOrder(): string[] {
  const ids: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    const { props, children } = node as { props?: { testID?: string }; children?: unknown[] }
    if (props?.testID) ids.push(props.testID)
    children?.forEach(walk)
  }
  walk(screen.toJSON())
  return ids
}

describe('PileView run outline', () => {
  beforeEach(() => {
    for (const id of Object.keys(mockRings)) delete mockRings[id]
  })

  it('glows under a hinted run, from the run head to the bottom card, and marks none of its cards', async () => {
    await render(pile({ hintCount: 3 }))
    expect(screen.getAllByTestId('hint-glow')).toHaveLength(1)
    expect(CARDS.map((c) => mockRings[c.id].hinted)).toEqual([false, false, false, false, false])
    // An uncompressed column of face-up cards: card i sits i fan steps down; the run is cards 2 to 4.
    const step = faceUpFanOffset(CARD_WIDTH)
    const box = markBox('hint-glow')
    expect(box.top).toBeCloseTo(2 * step)
    expect(box.height).toBeCloseTo(2 * step + CARD_WIDTH / CARD_ASPECT)
    expect(box.width).toBe(CARD_WIDTH)
    // Under every card: no zIndex of its own, and drawn before the first card.
    expect(box.zIndex).toBeUndefined()
    const order = drawingOrder()
    expect(order.indexOf('run-hint-glow')).toBeLessThan(order.indexOf(`card-${CARDS[0].id}`))
  })

  it('glows under a single hinted card the same way, one card tall', async () => {
    await render(pile({ hintCount: 1 }))
    expect(screen.getAllByTestId('hint-glow')).toHaveLength(1)
    expect(mockRings[CARDS[4].id].hinted).toBe(false)
    const box = markBox('hint-glow')
    expect(box.top).toBeCloseTo(4 * faceUpFanOffset(CARD_WIDTH))
    expect(box.height).toBeCloseTo(CARD_WIDTH / CARD_ASPECT)
  })

  it('does the same for a selected run, and the selection wins over a hint like on a single card', async () => {
    await render(pile({ selectedCount: 2, hintCount: 3 }))
    expect(screen.getAllByTestId('outline-selected')).toHaveLength(1)
    expect(markBox('outline-selected').zIndex).toBeGreaterThanOrEqual(CARDS.length)
    expect(screen.queryByTestId('hint-glow')).toBeNull()
    expect(CARDS.map((c) => mockRings[c.id].selected)).toEqual([false, false, false, false, false])
    expect(CARDS.map((c) => mockRings[c.id].hinted)).toEqual([false, false, false, false, false])
  })

  it('draws no glow while a card of the run is in flight', async () => {
    await render(pile({ hintCount: 3, hiddenCardIds: new Set([CARDS[3].id]) }))
    expect(screen.queryByTestId('hint-glow')).toBeNull()
  })
})
