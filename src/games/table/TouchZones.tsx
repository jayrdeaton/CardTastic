// The touch zones of a table two people can play at once (RatSlap, Slapjack, War, Speed): a GestureDetector over each
// player's half, so two fingers never race for one responder (React Native's own touch system takes one at a time, which
// would drop the second player's tap), or one over the whole table against the CPU. A touch reaches the game at
// touch-down, in table coordinates, with the player whose zone it landed in.

import { callWorkletCallback, useWorkletCallback } from '@rific/core'
import { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'

import type { PlayerIndex } from './players'

export function TouchZones({ testID, twoPlayer, splitY, height, enabled, onTouch }: { testID: string; twoPlayer: boolean; splitY: number; height: number; enabled: boolean; onTouch: (player: PlayerIndex, x: number, y: number) => void }) {
  // A touch arrives in its zone's own coordinates: player 1's half starts at the split.
  const handle = useCallback((player: PlayerIndex, zoneX: number, zoneY: number) => onTouch(player, zoneX, zoneY + (twoPlayer && player === 1 ? splitY : 0)), [onTouch, twoPlayer, splitY])
  const touchKey = useWorkletCallback(handle)
  const zoneGesture = useCallback(
    (player: PlayerIndex) =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .enabled(enabled)
        // At touch-down. onBegin, not onStart: a pan only starts once the finger moves on iOS, so a still tap never
        // reached onStart there.
        .onBegin((e) => {
          scheduleOnRN(callWorkletCallback, touchKey, player, e.x, e.y)
        }),
    [enabled, touchKey]
  )
  const p1Gesture = useMemo(() => zoneGesture(1), [zoneGesture])
  const p2Gesture = useMemo(() => zoneGesture(2), [zoneGesture])
  return twoPlayer ? (
    <>
      <GestureDetector gesture={p1Gesture}>
        <View collapsable={false} style={[styles.zone, { height: height - splitY, top: splitY }]} testID={`${testID}-zone-1`} />
      </GestureDetector>
      <GestureDetector gesture={p2Gesture}>
        <View collapsable={false} style={[styles.zone, styles.top, { height: splitY }]} testID={`${testID}-zone-2`} />
      </GestureDetector>
    </>
  ) : (
    <GestureDetector gesture={p1Gesture}>
      <View collapsable={false} style={StyleSheet.absoluteFill} testID={`${testID}-zone-1`} />
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  top: { top: 0 },
  zone: { left: 0, position: 'absolute', right: 0 }
})
