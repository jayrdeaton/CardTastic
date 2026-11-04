// RatSlap's cards in the air: a card played from a deck onto the pile (turning face up), a burned card
// slid under the pile, and a won pile carried to its winner's deck (turning face down). The table
// never turns, so every pose is a plain screen position. Each flight is its own card-sized view (never
// a zero frame, see CLAUDE.md's flight-container note), moved on the UI thread, and lands on a JS
// timer at its duration.

import { type AnyCard } from '@tastic/cards'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { FaceLoadTrackingContext } from '@/components/cardFacePaint'
import { PlayingCard } from '@/components/PlayingCard'

import type { Point } from './layout'

export interface FlightPose extends Point {
  /** Degrees. */
  rotate: number
}

export interface Flight {
  key: string
  /** The card on top, face up or down as the flight says. */
  card: AnyCard
  /** Backs drawn under it, for a pile carried away (up to 2). */
  under: number
  from: FlightPose
  to: FlightPose
  faceUpFrom: boolean
  faceUpTo: boolean
  durationMs: number
}

/** A card played onto the pile, or burned under it. */
export const PLAY_FLIGHT_MS = 240
/** A won pile carried to its winner. */
export const COLLECT_FLIGHT_MS = 380

const UNDER_OFFSET = 2.5

export function RatSlapFlights({ flights, cardWidth, cardHeight, onLanded }: { flights: Flight[]; cardWidth: number; cardHeight: number; onLanded: (key: string) => void }) {
  return (
    // A ghost's face never reports to the board's face-load registry (cardFacePaint.ts).
    <FaceLoadTrackingContext.Provider value={false}>
      <View pointerEvents='none' style={StyleSheet.absoluteFill}>
        {flights.map((flight) => (
          <FlyingCard key={flight.key} flight={flight} cardWidth={cardWidth} cardHeight={cardHeight} onLanded={onLanded} />
        ))}
      </View>
    </FaceLoadTrackingContext.Provider>
  )
}

function FlyingCard({ flight, cardWidth, cardHeight, onLanded }: { flight: Flight; cardWidth: number; cardHeight: number; onLanded: (key: string) => void }) {
  const progress = useSharedValue(0)
  const { from, to, faceUpFrom, faceUpTo, durationMs, key } = flight
  const flips = faceUpFrom !== faceUpTo

  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) })
    const timer = setTimeout(() => onLanded(key), durationMs)
    return () => clearTimeout(timer)
  }, [progress, durationMs, key, onLanded])

  const moveStyle = useAnimatedStyle(() => {
    const p = progress.value
    return {
      transform: [
        { translateX: from.x + (to.x - from.x) * p - cardWidth / 2 },
        { translateY: from.y + (to.y - from.y) * p - cardHeight / 2 },
        { rotate: `${from.rotate + (to.rotate - from.rotate) * p}deg` },
        // Turning over: the card narrows to an edge at the halfway mark and widens again showing its other side.
        { scaleX: flips ? Math.max(0.02, Math.abs(Math.cos(Math.PI * p))) : 1 }
      ]
    }
  })
  // Both sides are mounted from take-off, so the face has painted by the time it turns into view.
  const faceStyle = useAnimatedStyle(() => {
    const faceUp = flips && progress.value >= 0.5 ? faceUpTo : faceUpFrom
    return { opacity: faceUp ? 1 : 0 }
  })

  const size = { height: cardHeight, width: cardWidth }
  return (
    <Animated.View style={[styles.flight, size, moveStyle]}>
      {Array.from({ length: Math.min(2, flight.under) }, (_, i) => (
        <View key={i} style={[styles.layer, { transform: [{ translateX: (i + 1) * UNDER_OFFSET }, { translateY: (i + 1) * UNDER_OFFSET }] }]}>
          <PlayingCard card={{ ...flight.card, id: `${flight.card.id}-under-${i}`, faceUp: false }} disabled />
        </View>
      ))}
      <View style={styles.layer}>
        <PlayingCard card={{ ...flight.card, faceUp: false }} disabled />
      </View>
      {faceUpFrom || faceUpTo ? (
        <Animated.View style={[styles.layer, faceStyle]}>
          <PlayingCard card={{ ...flight.card, faceUp: true }} disabled />
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  flight: { left: 0, position: 'absolute', top: 0 },
  layer: { left: 0, position: 'absolute', top: 0 }
})
