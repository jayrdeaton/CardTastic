import { type AnyCard, CARD_ASPECT, CardSizeProvider } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const SEVEN_OF_HEARTS: AnyCard = { id: 'preview-hearts-7', suit: 'hearts', rank: 7, faceUp: true }
const SEVEN_OF_SPADES: AnyCard = { id: 'preview-spades-7', suit: 'spades', rank: 7, faceUp: true }
const BACK: AnyCard = { id: 'preview-back', suit: 'clubs', rank: 2, faceUp: false }

/** RatSlap's Home tile: a deck at each end of the table and a double on the pile between them, ready to
 * slap. Five live cards (the solitaire tiles' baked face layer is for whole deals). */
export function RatSlapPreview(props: GamePreviewProps) {
  return <SlapPreview {...props} under={SEVEN_OF_SPADES} top={SEVEN_OF_HEARTS} />
}

/** A slap game's tile: a deck at each end of the table, and two cards on the pile between them. */
export function SlapPreview({ width, height, under, top }: GamePreviewProps & { under: AnyCard; top: AnyCard }) {
  const colors = useTableColors()
  const cardHeight = height * 0.6
  const cardWidth = cardHeight * CARD_ASPECT
  const at = (cx: number, rotate = 0, nudge = 0): ViewStyle => ({ left: cx - cardWidth / 2 + nudge, position: 'absolute', top: (height - cardHeight) / 2 + nudge, transform: [{ rotate: `${rotate}deg` }] })
  return (
    <View style={[styles.box, { backgroundColor: colors.tableFelt, height, width }]}>
      <CardSizeProvider width={cardWidth}>
        <PlayingCard card={BACK} disabled style={at(width * 0.17, 0, 3)} />
        <PlayingCard card={BACK} disabled style={at(width * 0.17)} />
        <PlayingCard card={under} disabled style={at(width * 0.5 - cardWidth * 0.12, -10)} />
        <PlayingCard card={top} disabled style={at(width * 0.5 + cardWidth * 0.12, 8)} />
        <PlayingCard card={BACK} disabled style={at(width * 0.83, 0, 3)} />
        <PlayingCard card={BACK} disabled style={at(width * 0.83)} />
      </CardSizeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' }
})
