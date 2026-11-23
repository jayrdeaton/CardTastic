import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { usePreviewFelt } from '@/components/previewFelt'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit, faceUp = true): AnyCard => ({ id: `preview-${suit}-${rank}-${faceUp ? 'up' : 'down'}`, suit, rank, faceUp })

// Ace to 5 over 6 to 10: the Ace, 3, 4 and 7 in, a Jack standing in for the 9, the rest still face down.
const SPOTS: AnyCard[] = [card(1, 'spades'), card(6, 'clubs', false), card(3, 'hearts'), card(4, 'diamonds'), card(9, 'clubs', false), card(2, 'hearts', false), card(7, 'spades'), card(10, 'diamonds', false), card(11, 'hearts'), card(5, 'spades', false)]

/** Trash's Home tile: a player's ten spots, some filled, one by a wild Jack. */
export function TrashPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const felt = usePreviewFelt()
  const gap = height * 0.04
  const cardHeight = (height - gap * 3) / 2
  const cardWidth = Math.min(cardHeight * CARD_ASPECT, (width - gap * 6) / 5)
  const left = (width - cardWidth * 5 - gap * 4) / 2
  const at = (i: number): ViewStyle => ({ left: left + (i % 5) * (cardWidth + gap), position: 'absolute', top: gap + Math.floor(i / 5) * (cardHeight + gap) })
  return (
    <View style={[styles.box, { backgroundColor: felt ? colors.tableFelt : undefined, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        {SPOTS.map((c, i) => (
          <PlayingCard key={c.id} card={c} disabled style={at(i)} />
        ))}
      </CardSizeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' }
})
