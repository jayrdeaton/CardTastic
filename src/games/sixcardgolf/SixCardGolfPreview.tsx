import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit, faceUp = true): AnyCard => ({ id: `preview-${suit}-${rank}`, suit, rank, faceUp })

// Two rows of three, a pair of 8s in the middle column, and the discard beside them.
const GRID: AnyCard[] = [card(4, 'hearts'), card(8, 'spades'), card(2, 'clubs', false), card(13, 'diamonds', false), card(8, 'hearts'), card(13, 'clubs')]
const DISCARD = card(3, 'diamonds')

/** Six-Card Golf's Home tile: a player's six cards, half of them up, with a pair of 8s in a column, and the discard. */
export function SixCardGolfPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const gap = height * 0.04
  const cardHeight = (height - gap * 3) / 2
  const cardWidth = cardHeight * CARD_ASPECT
  const gridWidth = cardWidth * 3 + gap * 2
  const left = (width - gridWidth - cardWidth - gap * 4) / 2
  const at = (x: number, y: number, rotate = 0): ViewStyle => ({ left: x, position: 'absolute', top: y, transform: [{ rotate: `${rotate}deg` }] })
  return (
    <View style={[styles.box, { backgroundColor: colors.tableFelt, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        {GRID.map((c, i) => (
          <PlayingCard key={c.id} card={c} disabled style={at(left + (i % 3) * (cardWidth + gap), gap + Math.floor(i / 3) * (cardHeight + gap))} />
        ))}
        <PlayingCard card={DISCARD} disabled style={at(left + gridWidth + gap * 4, (height - cardHeight) / 2, 6)} />
      </CardSizeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' }
})
