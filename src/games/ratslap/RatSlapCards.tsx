// Every card on RatSlap's table that isn't in a deck: the pile, the burned cards under it, and a won
// pile on its way to its winner. Each card is ONE view for its whole time on the table: it appears
// over the deck it was played from, turns face up as it moves onto the pile, slides along the fan
// as newer cards land, and turns face down again as it's carried off. Nothing is handed from a flying
// ghost to a resting copy, so no card ever blinks out between the two, and a face that has been on
// screen is never mounted again. The table never turns, so every pose is a plain screen position.

import { type AnyCard } from '@tastic/cards'
import { memo, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { FaceLoadTrackingContext } from '@/components/cardFacePaint'
import { PlayingCard } from '@/components/PlayingCard'

import type { Pose } from './layout'

/** A card played onto the pile, or burned under it, and the fan making room for it. */
export const PLAY_MOVE_MS = 240
/** A won pile carried to its winner. */
export const COLLECT_MOVE_MS = 380

export interface TableCardSpec {
  card: AnyCard
  /** Where it lies, or is on its way to. */
  pose: Pose
  faceUp: boolean
  /** Out of play (a burned card): a scrim over its face, which still reads, so it isn't taken for part of the fan. */
  dimmed?: boolean
  /** Where it first appears, face down: the deck it was played from. Omitted, it appears where it lies. */
  from?: Pose
  /** How long a move to a new pose takes. */
  durationMs: number
}

/** The table's cards, bottom to top: later cards are drawn over earlier ones. */
export function RatSlapCards({ cards, cardWidth, cardHeight }: { cards: TableCardSpec[]; cardWidth: number; cardHeight: number }) {
  return (
    // Nothing waits on these faces painting (cardFacePaint.ts is for the solitaire boards' ghosts).
    <FaceLoadTrackingContext.Provider value={false}>
      <View pointerEvents='none' style={StyleSheet.absoluteFill} testID='ratslap-pile'>
        {cards.map(({ card, pose, faceUp, dimmed, from, durationMs }) => (
          <TableCard key={card.id} card={card} x={pose.x} y={pose.y} rotate={pose.rotate} faceUp={faceUp} dimmed={dimmed ?? false} fromX={from?.x} fromY={from?.y} fromRotate={from?.rotate} durationMs={durationMs} width={cardWidth} height={cardHeight} />
        ))}
      </View>
    </FaceLoadTrackingContext.Provider>
  )
}

interface TableCardProps {
  card: AnyCard
  x: number
  y: number
  rotate: number
  faceUp: boolean
  dimmed: boolean
  fromX?: number
  fromY?: number
  fromRotate?: number
  durationMs: number
  width: number
  height: number
}

const TableCard = memo(function TableCard({ card, x, y, rotate, faceUp, dimmed, fromX, fromY, fromRotate, durationMs, width, height }: TableCardProps) {
  // Where it starts is read once, at mount: a card that appears over a deck starts there, face down.
  const appearsOverDeck = fromX !== undefined && fromY !== undefined && fromRotate !== undefined
  const px = useSharedValue(appearsOverDeck ? fromX : x)
  const py = useSharedValue(appearsOverDeck ? fromY : y)
  const rot = useSharedValue(appearsOverDeck ? fromRotate : rotate)
  // 0 shows the back, 1 the face; between, the card turns over.
  const face = useSharedValue(appearsOverDeck || !faceUp ? 0 : 1)

  useEffect(() => {
    const move = { duration: durationMs, easing: Easing.out(Easing.cubic) }
    px.value = withTiming(x, move)
    py.value = withTiming(y, move)
    rot.value = withTiming(rotate, move)
    // The turn runs evenly, so the face comes into view halfway through the move, by which time its
    // image has painted (it's mounted, unseen, from the start).
    face.value = withTiming(faceUp ? 1 : 0, { duration: durationMs, easing: Easing.linear })
  }, [px, py, rot, face, x, y, rotate, faceUp, durationMs])

  const moveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: px.value - width / 2 },
      { translateY: py.value - height / 2 },
      { rotate: `${rot.value}deg` },
      // Turning over: the card narrows to an edge halfway and widens again showing its other side.
      { scaleX: Math.max(0.02, Math.abs(Math.cos(Math.PI * face.value))) }
    ]
  }))
  const faceStyle = useAnimatedStyle(() => ({ opacity: face.value >= 0.5 ? 1 : 0 }))

  // A card-sized view (never a zero frame, see CLAUDE.md's flight-container note), with both sides
  // mounted for its whole time on the table.
  return (
    <Animated.View style={[styles.card, { height, width }, moveStyle]} testID={`ratslap-pile-${card.id}`}>
      <View style={styles.side}>
        <PlayingCard card={{ ...card, faceUp: false }} disabled />
      </View>
      <Animated.View style={[styles.side, faceStyle]}>
        <PlayingCard card={{ ...card, faceUp: true }} dimmed={dimmed} disabled />
      </Animated.View>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  card: { left: 0, position: 'absolute', top: 0 },
  side: { left: 0, position: 'absolute', top: 0 }
})
