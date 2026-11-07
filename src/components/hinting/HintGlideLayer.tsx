import { CARD_ASPECT, CardSizeProvider } from '@tastic/cards'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { FaceLoadTrackingContext, useGhostPaintGate } from '@/components/cardFacePaint'
import { scaledMs } from '@/components/dragdrop/dragSpring'
import { startHintGlide } from '@/components/hintAnimation'
import { PlayingCard } from '@/components/PlayingCard'
import { Card } from '@/engine/types'

/** A screen-space rect, as `measureInWindow` reports it (CardRegistry, DropZoneRegistry, measureView). */
export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

/** One hint glide: a see-through copy of `cards` (the anchor card first, as the column fans them) lifts off `from` and
 * glides onto `to`, then fades out there. The real cards never move. */
export interface HintGlideSpec {
  cards: Card[]
  /** The anchor card's own rect. */
  from: ScreenRect
  /** Where the anchor lands: the card it lands on (with `toOffsetY` the fan step below it) or an empty slot. */
  to: ScreenRect
  /** Added to the landing point: the fan step when landing on a fanned card, else 0. */
  toOffsetY: number
  /** The fan step between the cards of a run, in the board's own frame (0 for one card). */
  step: number
  cardWidth: number
}

/** How see-through the copy is: clearly a preview, never mistaken for the real card. */
export const HINT_GLIDE_OPACITY = 0.7
export const HINT_GLIDE_FADE_IN_MS = 150
/** The glide itself, a little slower than a real flight (FLIGHT_SPRING) so it reads as a suggestion, not a move. */
export const HINT_GLIDE_MS = scaledMs(300)
/** A beat on the landing spot before it fades. */
export const HINT_GLIDE_HOLD_MS = 200
export const HINT_GLIDE_FADE_OUT_MS = 250
/** From the copy showing to the end of its beat on the landing spot: a held Hint button shows the next hint then
 * (GameChrome's HINT_HOLD_REPEAT_MS), replacing this one as it would start to fade. */
export const HINT_GLIDE_LANDED_MS = HINT_GLIDE_FADE_IN_MS + HINT_GLIDE_MS + HINT_GLIDE_HOLD_MS
/** From the copy showing to it being gone. */
export const HINT_GLIDE_TOTAL_MS = HINT_GLIDE_FADE_IN_MS + HINT_GLIDE_MS + HINT_GLIDE_HOLD_MS + HINT_GLIDE_FADE_OUT_MS

interface HintGlideController {
  play: (spec: HintGlideSpec) => void
  clear: () => void
}

const HintGlideContext = createContext<HintGlideController | null>(null)

/** The screen's hint glide (see useHintGlide in games/shared for the per-screen side). Null outside a game screen. */
export function useHintGlideLayer(): HintGlideController | null {
  return useContext(HintGlideContext)
}

/**
 * The hint's see-through glide, drawn over the board and under every flight ghost (it sits inside the other ghost
 * providers, see withGameProviders). At most one glide at a time: a new one replaces it. It never registers anything,
 * hides anything or claims a flight, so nothing about the game waits on it.
 */
export function HintGlideProvider({ children }: { children: ReactNode }) {
  const [glide, setGlide] = useState<{ gen: number; spec: HintGlideSpec } | null>(null)
  const genRef = useRef(0)
  const play = useCallback((spec: HintGlideSpec) => setGlide({ gen: ++genRef.current, spec }), [])
  const clear = useCallback(() => setGlide(null), [])
  const handleDone = useCallback((gen: number) => setGlide((current) => (current?.gen === gen ? null : current)), [])
  const controller = useMemo(() => ({ play, clear }), [play, clear])
  return (
    <HintGlideContext.Provider value={controller}>
      {children}
      <View pointerEvents='none' style={StyleSheet.absoluteFill}>
        {glide ? <HintGlideGhost key={glide.gen} gen={glide.gen} spec={glide.spec} onDone={handleDone} /> : null}
      </View>
    </HintGlideContext.Provider>
  )
}

function HintGlideGhost({ gen, spec, onDone }: { gen: number; spec: HintGlideSpec; onDone: (gen: number) => void }) {
  const cardHeight = spec.cardWidth / CARD_ASPECT
  // Worked out once, at mount: the glide is a short preview of a board that isn't moving. The measured window coordinates
  // are this overlay's own: it fills the game screen, which starts at the window's origin.
  const [path] = useState(() => ({ from: { x: spec.from.x, y: spec.from.y }, to: { x: spec.to.x, y: spec.to.y + spec.toOffsetY } }))
  const x = useSharedValue(path.from.x)
  const y = useSharedValue(path.from.y)
  const opacity = useSharedValue(0)
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }, { translateY: y.value }] }))

  // A fresh face Image paints a frame or two after it mounts (cardFacePaint.ts): the copy starts once its faces have.
  const faceIds = useMemo(() => spec.cards.filter((c) => c.faceUp).map((c) => c.id), [spec.cards])
  const [started, setStarted] = useState(false)
  const handleShown = useCallback(() => setStarted(true), [])
  const { markPainted } = useGhostPaintGate(faceIds, handleShown)

  useEffect(() => {
    if (!started) return
    startHintGlide(x, y, opacity, path.to, { opacity: HINT_GLIDE_OPACITY, fadeInMs: HINT_GLIDE_FADE_IN_MS, glideMs: HINT_GLIDE_MS, holdMs: HINT_GLIDE_HOLD_MS, fadeOutMs: HINT_GLIDE_FADE_OUT_MS })
    // Retired on a JS timer, not an animation callback: the copy is gone by then either way.
    const done = setTimeout(() => onDone(gen), HINT_GLIDE_TOTAL_MS + 50)
    return () => clearTimeout(done)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  // An explicit size: a container whose only children are absolutely positioned lays out as a zero frame, which picks
  // up a recycled UIView's old position on iOS (see DealLayer.tsx's slotSize).
  const groupHeight = cardHeight + Math.max(0, spec.cards.length - 1) * spec.step
  return (
    <CardSizeProvider width={spec.cardWidth}>
      <FaceLoadTrackingContext.Provider value={false}>
        <Animated.View testID='hint-glide' style={[styles.group, { width: spec.cardWidth, height: groupHeight }, animatedStyle]}>
          {spec.cards.map((c, i) => (
            <View key={c.id} style={[styles.card, { top: i * spec.step }]}>
              <PlayingCard card={c} onFacePainted={c.faceUp ? () => markPainted(c.id) : undefined} />
            </View>
          ))}
        </Animated.View>
      </FaceLoadTrackingContext.Provider>
    </CardSizeProvider>
  )
}

const styles = StyleSheet.create({
  card: {
    left: 0,
    position: 'absolute'
  },
  group: {
    left: 0,
    position: 'absolute',
    top: 0
  }
})
