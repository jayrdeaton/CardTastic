import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit): AnyCard => ({ id: `preview-${suit}-${rank}`, suit, rank, faceUp: true })

// A hand laid out as the table shows it: three 7s, the 4-5-6 of hearts, then what's left over.
const GROUPS: AnyCard[][] = [
  [card(7, 'clubs'), card(7, 'diamonds'), card(7, 'spades')],
  [card(4, 'hearts'), card(5, 'hearts'), card(6, 'hearts')],
  [card(2, 'spades'), card(13, 'clubs')]
]
/** Each card shows this share of its width past the next, as in the table's hand. */
const STEP = 0.52
const GROUP_GAP = 0.12

/** Gin Rummy's Home tile: a hand fanned in its melds, each with the hint ring's line under it. */
export function GinRummyPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const count = GROUPS.flat().length
  const units = 1 + (count - 1) * STEP + (GROUPS.length - 1) * GROUP_GAP
  const cardWidth = Math.min((width * 0.92) / units, height * 0.7 * CARD_ASPECT)
  const cardHeight = cardWidth / CARD_ASPECT
  const top = (height - cardHeight) / 2 - height * 0.04
  let x = (width - units * cardWidth) / 2
  const placed: { card: AnyCard; style: ViewStyle }[] = []
  const lines: { left: number; width: number }[] = []
  GROUPS.forEach((group, g) => {
    const left = x
    group.forEach((c, i) => {
      placed.push({ card: c, style: { left: x, position: 'absolute', top } })
      if (i < group.length - 1) x += cardWidth * STEP
    })
    const right = g === GROUPS.length - 1 ? x + cardWidth : x + cardWidth * STEP
    if (g < GROUPS.length - 1) lines.push({ left, width: right - left })
    x += cardWidth * (STEP + GROUP_GAP)
  })
  return (
    <View style={[styles.box, { backgroundColor: colors.tableFelt, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        {placed.map(({ card: c, style }) => (
          <PlayingCard key={c.id} card={c} disabled style={style} />
        ))}
      </CardSizeProvider>
      {lines.map(({ left, width: lineWidth }) => (
        <View key={left} style={[styles.line, { backgroundColor: colors.hintGreen, left: left + 2, top: top + cardHeight + 4, width: lineWidth - 4 }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  line: { borderRadius: 1.5, height: 3, position: 'absolute' }
})
