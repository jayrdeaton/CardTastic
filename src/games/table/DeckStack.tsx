import { type AnyCard } from '@tastic/cards'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { EmptySlot, PlayingCard } from '@/components/PlayingCard'

import type { Pose } from './geometry'

/** The backs drawn for a deck: its top and two under it, each a little lower and to the right. */
const UNDER_OFFSETS = [5, 2.5, 0]

/** A face-down deck (War's, a player's deck in RatSlap's style): up to three backs stacked a little apart, or an empty
 * slot once it's out. Drawn over the table's moving cards, so a card leaving it slides out from under it and a won pile
 * slides in under it. The backs are plain art: no card here moves. */
export function DeckStack({ at, count, cardWidth, cardHeight, testID }: { at: Pose; count: number; cardWidth: number; cardHeight: number; testID: string }) {
  const style: ViewStyle = { left: at.x - cardWidth / 2, position: 'absolute', top: at.y - cardHeight / 2, transform: [{ rotate: `${at.rotate}deg` }] }
  if (count === 0) return <EmptySlot style={style} />
  const shown = UNDER_OFFSETS.slice(-Math.min(count, UNDER_OFFSETS.length))
  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill} testID={testID}>
      {shown.map((offset) => (
        <PlayingCard key={offset} card={backOf(testID, offset)} disabled style={[style, { transform: [{ rotate: `${at.rotate}deg` }, { translateX: offset }, { translateY: offset }] }]} />
      ))}
    </View>
  )
}

function backOf(testID: string, offset: number): AnyCard {
  return { id: `${testID}-back-${offset}`, suit: 'clubs', rank: 2, faceUp: false }
}
