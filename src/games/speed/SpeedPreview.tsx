import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit, faceUp = true): AnyCard => ({ id: `preview-${suit}-${rank}-${faceUp ? 'up' : 'down'}`, suit, rank, faceUp })

// The two center piles with a side pile either side, and a hand of five under them with a 9 going on the 8.
const MIDDLE: AnyCard[] = [card(2, 'clubs', false), card(8, 'hearts'), card(4, 'spades'), card(3, 'diamonds', false)]
const HAND: AnyCard[] = [card(12, 'clubs'), card(9, 'spades'), card(5, 'hearts'), card(1, 'diamonds'), card(10, 'clubs')]

/** Speed's Home tile: the middle of the table and a hand of five below it. */
export function SpeedPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const gap = height * 0.04
  const cardHeight = (height - gap * 3) / 2
  const cardWidth = Math.min(cardHeight * CARD_ASPECT, (width - gap * 6) / 5)
  const at = (count: number, i: number, row: number): ViewStyle => ({ left: (width - count * cardWidth - (count - 1) * gap) / 2 + i * (cardWidth + gap), position: 'absolute', top: gap + row * (cardHeight + gap) })
  return (
    <View style={[styles.box, { backgroundColor: colors.tableFelt, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        {MIDDLE.map((c, i) => (
          <PlayingCard key={c.id} card={c} disabled style={at(MIDDLE.length, i, 0)} />
        ))}
        {HAND.map((c, i) => (
          <PlayingCard key={c.id} card={c} disabled style={at(HAND.length, i, 1)} />
        ))}
      </CardSizeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' }
})
