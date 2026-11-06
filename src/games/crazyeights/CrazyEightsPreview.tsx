import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit, faceUp = true): AnyCard => ({ id: `preview-${suit}-${rank}`, suit, rank, faceUp })

// The pile with a 9 of hearts on top, and a hand under it: the 7 of hearts, the 9 of clubs and an 8 raised (they fit),
// the 4 of spades not.
const PILE: AnyCard[] = [card(5, 'diamonds'), card(9, 'hearts')]
const HAND: { card: AnyCard; fits: boolean }[] = [
  { card: card(4, 'spades'), fits: false },
  { card: card(7, 'hearts'), fits: true },
  { card: card(9, 'clubs'), fits: true },
  { card: card(8, 'spades'), fits: true }
]
/** Each card in hand shows this share of its width past the next, as on the table. */
const STEP = 0.52

/** Crazy Eights' Home tile: the pile, and a hand under it with the cards that fit raised. */
export function CrazyEightsPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const units = 1 + (HAND.length - 1) * STEP
  const cardWidth = Math.min((width * 0.8) / units, ((height * 0.92) / 2.15) * CARD_ASPECT)
  const cardHeight = cardWidth / CARD_ASPECT
  const lift = cardHeight * 0.12
  const pileTop = height / 2 - cardHeight * 1.05
  const handTop = height / 2 + cardHeight * 0.05
  const placed: { card: AnyCard; style: ViewStyle }[] = []
  PILE.forEach((c, i) => placed.push({ card: c, style: { left: width / 2 - cardWidth / 2 + (i === 0 ? -cardWidth * 0.08 : 0), position: 'absolute', top: pileTop, transform: [{ rotate: i === 0 ? '-6deg' : '3deg' }] } }))
  let x = width / 2 - (units * cardWidth) / 2
  for (const { card: c, fits } of HAND) {
    placed.push({ card: c, style: { left: x, position: 'absolute', top: handTop - (fits ? lift : 0) } })
    x += cardWidth * STEP
  }
  return (
    <View style={[styles.box, { backgroundColor: colors.tableFelt, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        {placed.map(({ card: c, style }) => (
          <PlayingCard key={c.id} card={c} disabled style={style} />
        ))}
      </CardSizeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' }
})
