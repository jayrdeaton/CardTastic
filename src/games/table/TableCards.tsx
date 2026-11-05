// The cards on a two-player table (RatSlap's pile, Golf's and Trash's grids, stock and discard). Each card is ONE view
// for its whole time on the table: in RatSlap it appears over the deck it was played from, turns face up as it moves
// onto the pile, slides along the fan as newer cards land, and turns face down again as it's carried off; in Golf a card
// goes from the stock to the player's hand to their grid to the discard as the same view. Nothing is handed from a flying
// ghost to a resting copy, so no card ever blinks out between the two, and a face that has been on screen is never
// mounted again. The table never turns, so every pose is a plain screen position.

import { type AnyCard } from '@tastic/cards'
import { memo, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

import { FaceLoadTrackingContext } from '@/components/cardFacePaint'
import { PlayingCard } from '@/components/PlayingCard'

import type { Pose } from './geometry'

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
  /** How long a move waits before it starts (a deal's stagger). */
  delayMs?: number
}

/** The table's cards, bottom to top: later cards are drawn over earlier ones. */
export function TableCards({ cards, cardWidth, cardHeight, testID }: { cards: TableCardSpec[]; cardWidth: number; cardHeight: number; testID: string }) {
  return (
    // Nothing waits on these faces painting (cardFacePaint.ts is for the solitaire boards' ghosts).
    <FaceLoadTrackingContext.Provider value={false}>
      <View pointerEvents='none' style={StyleSheet.absoluteFill} testID={testID}>
        {cards.map(({ card, pose, faceUp, dimmed, from, durationMs, delayMs }) => (
          <TableCard key={card.id} card={card} x={pose.x} y={pose.y} rotate={pose.rotate} faceUp={faceUp} dimmed={dimmed ?? false} fromX={from?.x} fromY={from?.y} fromRotate={from?.rotate} durationMs={durationMs} delayMs={delayMs ?? 0} width={cardWidth} height={cardHeight} testID={`${testID}-${card.id}`} />
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
  delayMs: number
  width: number
  height: number
  testID: string
}

const TableCard = memo(function TableCard({ card, x, y, rotate, faceUp, dimmed, fromX, fromY, fromRotate, durationMs, delayMs, width, height, testID }: TableCardProps) {
  // Where it starts is read once, at mount: a card that appears over a deck starts there, face down.
  const appearsOverDeck = fromX !== undefined && fromY !== undefined && fromRotate !== undefined
  const px = useSharedValue(appearsOverDeck ? fromX : x)
  const py = useSharedValue(appearsOverDeck ? fromY : y)
  const rot = useSharedValue(appearsOverDeck ? fromRotate : rotate)
  // 0 shows the back, 1 the face; between, the card turns over.
  const face = useSharedValue(appearsOverDeck || !faceUp ? 0 : 1)

  useEffect(() => {
    const move = { duration: durationMs, easing: Easing.out(Easing.cubic) }
    px.value = withDelay(delayMs, withTiming(x, move))
    py.value = withDelay(delayMs, withTiming(y, move))
    rot.value = withDelay(delayMs, withTiming(rotate, move))
    // The turn runs evenly, so the face comes into view halfway through the move, by which time its
    // image has painted (it's mounted, unseen, from the start).
    face.value = withDelay(delayMs, withTiming(faceUp ? 1 : 0, { duration: durationMs, easing: Easing.linear }))
  }, [px, py, rot, face, x, y, rotate, faceUp, durationMs, delayMs])

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
    <Animated.View style={[styles.card, { height, width }, moveStyle]} testID={testID}>
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
