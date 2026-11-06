import { type AnyCard, CARD_ASPECT, CardSizeProvider, type Rank, type Suit } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { Icon } from 'react-native-paper'

import { PlayingCard } from '@/components/PlayingCard'
import { useTableColors } from '@/components/theme'

const card = (rank: Rank, suit: Suit, deck = 0): AnyCard => ({ id: `preview-${suit}-${rank}-${deck}`, suit, rank, faceUp: true })

// A round with 5s wild, laid out as the table shows it: three Queens (two of them spades, from the two decks), the
// 7-8-9 of clubs with a wild 5 standing in for the 8, then a King left over.
const GROUPS: AnyCard[][] = [[card(12, 'spades'), card(12, 'spades', 1), card(12, 'hearts')], [card(7, 'clubs'), card(5, 'diamonds'), card(9, 'clubs')], [card(13, 'diamonds')]]
const WILD_ID = 'preview-diamonds-5-0'
/** Each card shows this share of its width past the next, as in the table's hand. */
const STEP = 0.52
const GROUP_GAP = 0.12

/** Four Crowns' Home tile: a hand fanned in its melds, each with the hint ring's line under it, its wild crowned. */
export function FourCrownsPreview({ width, height }: GamePreviewProps) {
  const colors = useTableColors()
  const count = GROUPS.flat().length
  const units = 1 + (count - 1) * STEP + (GROUPS.length - 1) * GROUP_GAP
  const cardWidth = Math.min((width * 0.92) / units, height * 0.7 * CARD_ASPECT)
  const cardHeight = cardWidth / CARD_ASPECT
  const top = (height - cardHeight) / 2 - height * 0.04
  const badge = Math.max(10, Math.round(cardWidth * 0.3))
  let x = (width - units * cardWidth) / 2
  const placed: { card: AnyCard; style: ViewStyle }[] = []
  const lines: { left: number; width: number }[] = []
  let wildLeft = 0
  GROUPS.forEach((group, g) => {
    const left = x
    group.forEach((c, i) => {
      placed.push({ card: c, style: { left: x, position: 'absolute', top } })
      if (c.id === WILD_ID) wildLeft = x
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
      <View style={[styles.wild, { borderRadius: badge / 2, height: badge, left: wildLeft + (cardWidth * STEP - badge) / 2, top: top + cardHeight - badge - 3, width: badge }]}>
        <Icon source='crown' size={badge * 0.66} color='#fff' />
      </View>
      {lines.map(({ left, width: lineWidth }) => (
        <View key={left} style={[styles.line, { backgroundColor: colors.hintGreen, left: left + 2, top: top + cardHeight + 4, width: lineWidth - 4 }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  line: { borderRadius: 1.5, height: 3, position: 'absolute' },
  wild: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', position: 'absolute' }
})
