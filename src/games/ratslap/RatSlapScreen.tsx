// RatSlap's table. Not GameChrome: the table never turns with the phone (it lies flat between two
// players at its short edges), so it lays itself out in plain screen coordinates (layout.ts) and moves
// its own cards (RatSlapCards.tsx). Player 1 sits at the bottom; player 2, or the CPU, at the top. A
// tap on your own deck plays your top card; any other tap on your side is a slap, and against the CPU
// the whole table is yours.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { callWorkletCallback, useKeepAwake, useWorkletCallback } from '@rific/core'
import { Button } from '@rific/feedback-press'
import { type AnyCard, CardSizeProvider, isJoker, rankLabel } from '@tastic/cards'
import { DialogHeader, overlayActionStyles, OverlayBackdrop, OverlayCard, useCompactDialog, useOverlayCardColors } from '@tastic/hud/chrome'
import { useActiveRound, useProfiles, useSeatColors } from '@tastic/shell'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, type LayoutChangeEvent, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Icon, IconButton, Text } from 'react-native-paper'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { useDispatch } from 'react-redux'

import { GAME_DIALOG_Z_INDEX } from '@/components/GameChrome'
import { EmptySlot, PlayingCard } from '@/components/PlayingCard'
import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG, CHROME_FG_MUTED, previewCardBack, useTableColors } from '@/components/theme'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { GUEST_PLAYER_ID } from '@/constants/player'
import { useSettings } from '@/hooks/useSettings'
import { ratslapStatsActions } from '@/redux/ratslapStatsSlice'
import { usePlayer } from '@/stores/profiles'

import { CPU_LEVEL_LABELS } from './cpuLabels'
import { type CpuLevel } from './engine/cpu'
import { chancesFor, toPlay } from './engine/rules'
import { type PlayerIndex, type RatSlapRules, type RatSlapState } from './engine/types'
import { burnedPose, DECK_LABEL_ROOM, deckPose, halfAt, inRect, PILE_DRAWN, pileCardPose, type Point, type Pose, slapArea, type TableLayout, tableLayout } from './layout'
import { COLLECT_MOVE_MS, PLAY_MOVE_MS, RatSlapCards, type TableCardSpec } from './RatSlapCards'
import { type RatSlapRoundSettings } from './useRatSlapLoadout'
import { useRatSlapMatch } from './useRatSlapMatch'

/** How many burned cards are drawn: they all lie in one spot, so the newest and the one it covers. */
const BURNED_DRAWN = 2
/** The ring round the deck whose turn it is sits this far outside the card (a card back has a white frame of its own). */
const TURN_RING_GAP = 5
/** How long a "Slap!" or "Wrong slap" call stays up. */
const CALL_MS = 900
/** The result waits for the last pile to reach its winner. */
const RESULT_DELAY_MS = COLLECT_MOVE_MS + 250
/** A won pile's cards leave the table once they've reached their winner's deck. With room to spare: the
 * move runs on the UI thread and this timer on JS, and a card that has arrived lies hidden under the deck. */
const DEPARTURE_MS = COLLECT_MOVE_MS + 150
/** The hand drawn where a slap landed grows and fades over this long. */
const SLAP_MARK_MS = 450
const SLAP_MARK_SIZE = 56
/** The "Slap anywhere on your side" line: left out where the felt between the pile and the deck is
 * shorter than this. */
const SLAP_LABEL_HEIGHT = 28
const SLAP_LABEL_COLOR = 'rgba(255,255,255,0.5)'
/** Against the CPU, player 1 is the only person at the table. */
const VS_CPU_HUMANS: readonly PlayerIndex[] = [1]
const TWO_PLAYER_HUMANS: readonly PlayerIndex[] = [1, 2]

interface Seat {
  name: string
  /** A short tag for the badge, or an icon when there is none. */
  tag: string | null
  icon: string
  color: string
}

type Call = { player: PlayerIndex; text: string; key: number }
/** A won pile on its way to its winner: the cards drawn when it was won, bottom to top. */
type Departure = { key: number; player: PlayerIndex; cards: AnyCard[] }
/** A hand drawn where a slap landed. */
type SlapMark = { key: number; x: number; y: number; upsideDown: boolean }

export function RatSlapScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const { dark } = useAutoPaperTheme()
  const { profileId, profile, color: p1Color } = usePlayer()
  const dispatch = useDispatch()
  // Sized from the table's own box, not the window: on the web the window's reading can lag a resize.
  const window = useWindowDimensions()
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const width = size?.width ?? window.width
  const height = size?.height ?? window.height
  const insets = useSafeAreaInsets()
  const layout = useMemo(() => tableLayout(width, height, insets), [width, height, insets])
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }))
  }, [])
  const reduceMotion = useMotionReduced()
  const { playCardSound, playInvalidSound, hapticCard, hapticInvalid } = useCardSoundEffects()

  // The round the setup screen committed (who sits in seat 2, and the rules); a direct link plays the player's own
  // settings against the CPU. A match runs on the rules it was dealt with.
  const { mode, settings: round } = useActiveRound<RatSlapRoundSettings>('ratslap', { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu })
  const twoPlayer = mode === 'twoPlayer'
  const rules = useMemo<RatSlapRules>(() => ({ doubles: round.ratslapDoubles, sandwiches: round.ratslapSandwiches, jokers: round.ratslapJokers }), [round.ratslapDoubles, round.ratslapSandwiches, round.ratslapJokers])
  const cpu: CpuLevel | null = twoPlayer ? null : round.ratslapCpu
  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { profiles, lastSelected } = useProfiles()
  const { p2Color } = useSeatColors(twoPlayer)
  const p2Profile = twoPlayer ? (profiles.find((p) => p.id === lastSelected[2]) ?? null) : null

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appActive, setAppActive] = useState(AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setAppActive(next === 'active'))
    return () => subscription.remove()
  }, [])
  const [resultShown, setResultShown] = useState(false)
  const [matchOver, setMatchOver] = useState(false)
  // Each seat's slaps this match, recorded with the result.
  const slapsRef = useRef({ 1: { won: 0, wrong: 0 }, 2: { won: 0, wrong: 0 } })

  // The deck each card on the table came from, so it first appears there (read once, as it appears), and the
  // won piles still on their way to their winners.
  const [origins, setOrigins] = useState<ReadonlyMap<string, Pose>>(() => new Map())
  const [departures, setDepartures] = useState<Departure[]>([])
  const [marks, setMarks] = useState<SlapMark[]>([])
  const [call, setCall] = useState<Call | null>(null)
  const seq = useRef(0)
  const layoutRef = useRef(layout)
  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  /** A card leaving `player`'s deck for the table starts over that deck. */
  const leaveDeck = useCallback(
    (player: PlayerIndex, card: AnyCard) => {
      if (reduceMotion) return
      setOrigins((current) => new Map(current).set(card.id, deckPose(layoutRef.current, player)))
    },
    [reduceMotion]
  )
  const markSlap = useCallback(
    (at: Point, upsideDown: boolean) => {
      if (reduceMotion) return
      const key = seq.current++
      setMarks((current) => [...current, { key, x: at.x, y: at.y, upsideDown }])
    },
    [reduceMotion]
  )
  /** The CPU slaps the pile, from its side. */
  const markCpuSlap = useCallback(() => {
    const { center, cardWidth, cardHeight } = layoutRef.current
    markSlap({ x: center.x + (Math.random() - 0.5) * cardWidth, y: center.y - cardHeight / 4 }, true)
  }, [markSlap])
  useEffect(() => {
    if (departures.length === 0) return
    const timer = setTimeout(() => setDepartures((current) => current.slice(1)), DEPARTURE_MS)
    return () => clearTimeout(timer)
  }, [departures])
  useEffect(() => {
    if (marks.length === 0) return
    const timer = setTimeout(() => setMarks((current) => current.slice(1)), SLAP_MARK_MS)
    return () => clearTimeout(timer)
  }, [marks])

  const showCall = useCallback((player: PlayerIndex, text: string) => {
    setCall((current) => ({ player, text, key: (current?.key ?? 0) + 1 }))
  }, [])
  useEffect(() => {
    if (!call) return
    const timer = setTimeout(() => setCall(null), CALL_MS)
    return () => clearTimeout(timer)
  }, [call])

  const match = useRatSlapMatch({
    rules,
    cpu,
    paused: settingsOpen || !appActive || resultShown,
    events: {
      played: (player, card) => {
        playCardSound()
        leaveDeck(player, card)
      },
      burned: (player, card) => {
        slapsRef.current[player].wrong++
        playInvalidSound()
        if (humans.includes(player)) hapticInvalid()
        else markCpuSlap()
        showCall(player, 'Wrong slap')
        leaveDeck(player, card)
      },
      wonPile: (player, bySlap) => {
        if (!bySlap) return
        slapsRef.current[player].won++
        playCardSound()
        if (!humans.includes(player)) markCpuSlap()
        showCall(player, 'Slap!')
      },
      collected: (player, taken) => {
        if (reduceMotion) return
        // The cards drawn when the pile was won go to the winner's deck, turning face down on the way.
        const cards = [...taken.burned.slice(0, BURNED_DRAWN).reverse(), ...taken.pile.slice(-PILE_DRAWN)]
        setDepartures((current) => [...current, { key: seq.current++, player, cards }])
      },
      matchOver: (winner) => {
        setMatchOver(true)
        const slaps = slapsRef.current
        const seat1 = { player: profileId ?? GUEST_PLAYER_ID, won: winner === 1, slapsWon: slaps[1].won, wrongSlaps: slaps[1].wrong }
        const seat2 = { player: p2Profile?.id ?? null, won: winner === 2, slapsWon: slaps[2].won, wrongSlaps: slaps[2].wrong }
        dispatch(ratslapStatsActions.recordMatch({ cpu, seats: twoPlayer ? [seat1, seat2] : [seat1] }))
      }
    }
  })
  const { state, play, slap, rematch: newDeal } = match
  useEffect(() => {
    if (!matchOver) return
    const timer = setTimeout(() => setResultShown(true), RESULT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [matchOver])

  // With two people each half is one player's; alone against the CPU, the whole table is yours to slap on.
  // A touch arrives in its zone's own coordinates: the whole table against the CPU, a half each with two players, so
  // player 1's starts at the middle of the table.
  const handleTouch = useCallback(
    (player: PlayerIndex, zoneX: number, zoneY: number) => {
      const table = layoutRef.current
      const point = { x: zoneX, y: zoneY + (humans.length === 2 && player === 1 ? table.center.y : 0) }
      if (humans.length === 2 && halfAt(point, table) !== player) return
      if (inRect(point, table.deckTargets[player])) {
        if (play(player)) hapticCard()
        else hapticInvalid()
        return
      }
      markSlap(point, humans.length === 2 && player === 2)
      if (slap(player) === 'won') hapticCard()
    },
    [humans, play, slap, markSlap, hapticCard, hapticInvalid]
  )
  const touchKey = useWorkletCallback(handleTouch)
  const enabled = !settingsOpen && !resultShown && state.winner === null
  const zoneGesture = useCallback(
    (player: PlayerIndex) =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .enabled(enabled)
        // At touch-down, where in its zone the touch landed (handleTouch places it on the table). onBegin, not onStart: a pan
        // only starts once the finger moves on iOS, so a still tap never reached onStart there.
        .onBegin((e) => {
          scheduleOnRN(callWorkletCallback, touchKey, player, e.x, e.y)
        }),
    [enabled, touchKey]
  )
  const p1Gesture = useMemo(() => zoneGesture(1), [zoneGesture])
  const p2Gesture = useMemo(() => zoneGesture(2), [zoneGesture])

  const rematch = useCallback(() => {
    setResultShown(false)
    setMatchOver(false)
    slapsRef.current = { 1: { won: 0, wrong: 0 }, 2: { won: 0, wrong: 0 } }
    setOrigins(new Map())
    setDepartures([])
    setMarks([])
    newDeal()
  }, [newDeal])

  const seats: Record<PlayerIndex, Seat> = {
    1: { name: profile?.name ?? 'Guest', tag: profile?.tag || null, icon: 'account', color: previewCardBack(p1Color, dark) },
    2: twoPlayer ? { name: p2Profile?.name ?? 'Player 2', tag: p2Profile?.tag || null, icon: 'account', color: previewCardBack(p2Color, dark) } : { name: 'CPU', tag: null, icon: 'robot-outline', color: previewCardBack(p2Color, dark) }
  }

  const tableCards = useMemo(() => tableCardSpecs(state, layout, origins, departures, reduceMotion), [state, layout, origins, departures, reduceMotion])

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={handleLayout}>
        {humans.map((player) => (
          <SlapLabel key={player} layout={layout} player={player} upsideDown={player === 2} hidden={call?.player === player} />
        ))}
        {state.pile.length === 0 && state.burned.length === 0 ? <EmptySlot style={[styles.pileSlot, { left: layout.center.x - layout.cardWidth / 2, top: layout.center.y - layout.cardHeight / 2 }]} /> : null}
        <RatSlapCards cards={tableCards} cardWidth={layout.cardWidth} cardHeight={layout.cardHeight} />
        {([1, 2] as const).map((player) => (
          <DeckArea key={player} player={player} state={state} layout={layout} seat={seats[player]} subtitle={player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null} upsideDown={twoPlayer && player === 2} />
        ))}
        {marks.map((mark) => (
          <SlapMarkView key={mark.key} mark={mark} />
        ))}
        {call ? <CallText call={call} layout={layout} upsideDown={twoPlayer} /> : null}

        {twoPlayer ? (
          <>
            <GestureDetector gesture={p1Gesture}>
              <View collapsable={false} style={[styles.zone, { height: layout.height - layout.center.y, top: layout.center.y }]} testID='ratslap-zone-1' />
            </GestureDetector>
            <GestureDetector gesture={p2Gesture}>
              <View collapsable={false} style={[styles.zone, styles.zoneTop, { height: layout.center.y }]} testID='ratslap-zone-2' />
            </GestureDetector>
          </>
        ) : (
          <GestureDetector gesture={p1Gesture}>
            <View collapsable={false} style={styles.wholeTable} testID='ratslap-zone-1' />
          </GestureDetector>
        )}

        <View style={[styles.sideButtons, { top: layout.center.y - 24 }]} pointerEvents='box-none'>
          <IconButton icon='home' iconColor={CHROME_FG} accessibilityLabel='Home' onPress={() => router.dismissTo('/')} />
          <IconButton icon='cog' iconColor={CHROME_FG} accessibilityLabel='Settings' onPress={() => setSettingsOpen(true)} />
        </View>

        {resultShown && state.winner !== null ? <ResultOverlay winner={state.winner} seats={seats} humans={humans} onRematch={rematch} /> : null}
        {resultShown && state.winner !== null && humans.includes(state.winner) ? <PipFireworks /> : null}
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} rotation={0} />
    </CardSizeProvider>
  )
}

/** Every card on the table, bottom to top: won piles on their way out, then the burned cards (face up at
 * the bottom of the pile, dimmed since they never count toward a slap, the newest drawn over the rest),
 * then the pile, its top three fanned so each
 * rank shows. A card the table already draws is never drawn twice: a card played again while it's still
 * on its way to a deck goes back onto the pile from where it is. */
function tableCardSpecs(state: RatSlapState, layout: TableLayout, origins: ReadonlyMap<string, Pose>, departures: Departure[], reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : PLAY_MOVE_MS
  const burned = state.burned.slice(0, BURNED_DRAWN).reverse()
  const pile = state.pile.slice(-PILE_DRAWN)
  const live = new Set([...burned, ...pile].map((card) => card.id))
  const specs: TableCardSpec[] = []
  for (const departure of departures) {
    const pose = deckPose(layout, departure.player)
    for (const card of departure.cards) if (!live.has(card.id)) specs.push({ card, pose, faceUp: false, durationMs: COLLECT_MOVE_MS })
  }
  const burnedAt = burnedPose(layout, state.pile.length)
  for (const card of burned) specs.push({ card, pose: burnedAt, faceUp: true, dimmed: true, from: origins.get(card.id), durationMs: move })
  pile.forEach((card, i) => specs.push({ card, pose: pileCardPose(layout, pile.length - 1 - i, state.pile.length, card.id), faceUp: true, from: origins.get(card.id), durationMs: move }))
  return specs
}

/** The felt between the pile and a player's deck says where to slap. */
function SlapLabel({ layout, player, upsideDown, hidden }: { layout: TableLayout; player: PlayerIndex; upsideDown: boolean; hidden: boolean }) {
  const area = slapArea(layout, player)
  if (area.height < SLAP_LABEL_HEIGHT) return null
  return (
    <View pointerEvents='none' style={[styles.slapLabel, { height: SLAP_LABEL_HEIGHT, top: area.y - SLAP_LABEL_HEIGHT / 2 }, upsideDown && styles.flipped, hidden && styles.hidden]} testID={`ratslap-slap-label-${player}`}>
      <Icon source='hand-back-right' size={20} color={SLAP_LABEL_COLOR} />
      <Text variant='labelLarge' style={styles.slapLabelText}>
        Slap anywhere on your side
      </Text>
    </View>
  )
}

/** A hand where a slap landed, growing and fading. */
function SlapMarkView({ mark }: { mark: SlapMark }) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withTiming(1, { duration: SLAP_MARK_MS, easing: Easing.out(Easing.quad) })
  }, [progress])
  const turn = mark.upsideDown ? '180deg' : '0deg'
  const style = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - progress.value), transform: [{ scale: 0.7 + 0.5 * progress.value }, { rotate: turn }] }))
  return (
    <Animated.View pointerEvents='none' style={[styles.slapMark, { left: mark.x - SLAP_MARK_SIZE / 2, top: mark.y - SLAP_MARK_SIZE / 2 }, style]}>
      <Icon source='hand-back-right' size={SLAP_MARK_SIZE} color={CHROME_FG} />
    </Animated.View>
  )
}

/** A player's deck near their own edge, with their name and card count, a ring while it's theirs to
 * play, and the challenge they face. Out of cards, an empty slot: they can still slap back in. */
function DeckArea({ player, state, layout, seat, subtitle, upsideDown }: { player: PlayerIndex; state: RatSlapState; layout: TableLayout; seat: Seat; subtitle: string | null; upsideDown: boolean }) {
  const deck = layout.decks[player]
  const count = state.hands[player - 1].length
  const turn = toPlay(state) === player
  const challenge = state.challenge?.defender === player ? state.challenge : null
  const triesLeft = challenge ? challenge.requiredChances - challenge.chancesUsed : 0
  const cardStyle: ViewStyle = { left: deck.x - layout.cardWidth / 2, position: 'absolute', top: deck.y - layout.cardHeight / 2 }
  // Labels sit on the outside of the deck, toward the player's own edge, and read the right way up for them.
  const labelTop = player === 1 ? deck.y + layout.cardHeight / 2 + 6 : deck.y - layout.cardHeight / 2 - DECK_LABEL_ROOM
  const challengeTop = player === 1 ? deck.y - layout.cardHeight / 2 - DECK_LABEL_ROOM : deck.y + layout.cardHeight / 2 + 6
  const flip: ViewStyle = upsideDown ? { transform: [{ rotate: '180deg' }] } : {}
  const top = state.hands[player - 1][count - 1]
  // The hint ring's color: the one "act here" mark the solitaire games use.
  const ringColor = useTableColors().hintGreen
  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill} testID={`ratslap-deck-${player}`}>
      {count > 0 && top ? (
        <>
          {count > 2 ? <PlayingCard card={{ ...top, id: `${top.id}-under-2`, faceUp: false }} disabled style={[cardStyle, styles.under2]} /> : null}
          {count > 1 ? <PlayingCard card={{ ...top, id: `${top.id}-under-1`, faceUp: false }} disabled style={[cardStyle, styles.under1]} /> : null}
          <PlayingCard card={{ ...top, faceUp: false }} disabled style={cardStyle} />
          {turn ? <View style={[styles.turnRing, { borderColor: ringColor, height: layout.cardHeight + TURN_RING_GAP * 2, left: deck.x - layout.cardWidth / 2 - TURN_RING_GAP, top: deck.y - layout.cardHeight / 2 - TURN_RING_GAP, width: layout.cardWidth + TURN_RING_GAP * 2 }]} /> : null}
        </>
      ) : (
        <EmptySlot style={cardStyle} />
      )}
      <View style={[styles.label, { top: labelTop }, flip]}>
        <SeatBadge seat={seat} />
        <Text variant='labelLarge' style={styles.labelText} numberOfLines={1}>
          {seat.name}
          {subtitle ? <Text style={styles.subtitle}>{` · ${subtitle}`}</Text> : null}
        </Text>
        <Text variant='labelLarge' style={styles.count} testID={`ratslap-count-${player}`}>
          {count === 0 ? 'Out' : count}
        </Text>
      </View>
      {challenge ? (
        <View style={[styles.label, { top: challengeTop }, flip]}>
          <Text variant='labelLarge' style={styles.challenge}>
            {`${challengeLabel(challenge.triggerCard)} · ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left`}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function challengeLabel(card: AnyCard): string {
  if (isJoker(card)) return 'Joker'
  return chancesFor(card.rank) !== null ? rankLabel(card.rank) : ''
}

function SeatBadge({ seat }: { seat: Seat }) {
  return (
    <View style={[styles.badge, { backgroundColor: seat.color }]}>
      {seat.tag ? (
        <Text style={styles.badgeText} numberOfLines={1}>
          {seat.tag}
        </Text>
      ) : (
        <Icon source={seat.icon} size={14} color='#fff' />
      )}
    </View>
  )
}

/** "Slap!" or "Wrong slap", on the side of whoever did it, where their slap line sits. */
function CallText({ call, layout, upsideDown }: { call: Call; layout: TableLayout; upsideDown: boolean }) {
  const { y } = slapArea(layout, call.player)
  return (
    <View pointerEvents='none' style={[styles.call, { top: y - 24 }, upsideDown && call.player === 2 ? styles.flipped : null]}>
      <Text variant='headlineMedium' style={styles.callText}>
        {call.text}
      </Text>
    </View>
  )
}

/** The match's result: one card against the CPU; with two players, one in each half, each facing its player. */
function ResultOverlay({ winner, seats, humans, onRematch }: { winner: PlayerIndex; seats: Record<PlayerIndex, Seat>; humans: readonly PlayerIndex[]; onRematch: () => void }) {
  const { compact, onLayout } = useCompactDialog()
  return (
    <OverlayBackdrop style={styles.overlay} onLayout={onLayout}>
      {humans.length === 2 ? (
        <View style={styles.resultHalves}>
          <View style={[styles.resultHalf, styles.flipped]}>
            <ResultCard viewer={2} winner={winner} seats={seats} compact={compact} onRematch={onRematch} />
          </View>
          <View style={styles.resultHalf}>
            <ResultCard viewer={1} winner={winner} seats={seats} compact={compact} onRematch={onRematch} />
          </View>
        </View>
      ) : (
        <ResultCard viewer={1} winner={winner} seats={seats} compact={compact} onRematch={onRematch} />
      )}
    </OverlayBackdrop>
  )
}

function ResultCard({ viewer, winner, seats, compact, onRematch }: { viewer: PlayerIndex; winner: PlayerIndex; seats: Record<PlayerIndex, Seat>; compact: boolean; onRematch: () => void }) {
  const { colors } = useAutoPaperTheme()
  const { fg } = useOverlayCardColors()
  const won = viewer === winner
  return (
    <OverlayCard style={styles.resultCard}>
      <DialogHeader icon={won ? 'trophy' : 'cards-outline'} title={won ? 'You Won!' : `${seats[winner].name} Won`} compact={compact} />
      <Text variant='bodyLarge' style={[styles.resultBody, { color: fg }]}>
        {won ? 'Every card is yours.' : `${seats[winner].name} took every card.`}
      </Text>
      <View style={overlayActionStyles.actions}>
        <Button mode='outlined' onPress={() => router.dismissTo('/')} style={overlayActionStyles.actionButton} testID={`ratslap-home-${viewer}`}>
          Home
        </Button>
        <Button mode='contained' onPress={onRematch} style={overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary} testID={`ratslap-rematch-${viewer}`}>
          Rematch
        </Button>
      </View>
    </OverlayCard>
  )
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: 11, height: 22, justifyContent: 'center', minWidth: 22, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  call: { alignItems: 'center', left: 0, position: 'absolute', right: 0 },
  callText: { color: CHROME_FG, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  challenge: { color: CHROME_FG },
  count: { color: CHROME_FG_MUTED, minWidth: 28, textAlign: 'right' },
  flipped: { transform: [{ rotate: '180deg' }] },
  hidden: { opacity: 0 },
  label: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', left: 0, paddingHorizontal: 24, position: 'absolute', right: 0 },
  labelText: { color: CHROME_FG, flexShrink: 1 },
  overlay: { paddingHorizontal: 24, zIndex: GAME_DIALOG_Z_INDEX },
  pileSlot: { position: 'absolute' },
  resultBody: { textAlign: 'center' },
  resultCard: { width: '100%' },
  resultHalf: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  resultHalves: { alignSelf: 'stretch', flex: 1 },
  screen: { flex: 1 },
  sideButtons: { flexDirection: 'row', justifyContent: 'space-between', left: 4, position: 'absolute', right: 4 },
  slapLabel: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  slapLabelText: { color: SLAP_LABEL_COLOR },
  slapMark: { alignItems: 'center', height: SLAP_MARK_SIZE, justifyContent: 'center', position: 'absolute', width: SLAP_MARK_SIZE },
  subtitle: { color: CHROME_FG_MUTED },
  turnRing: { borderRadius: 12, borderWidth: 3, position: 'absolute' },
  under1: { transform: [{ translateX: 2.5 }, { translateY: 2.5 }] },
  under2: { transform: [{ translateX: 5 }, { translateY: 5 }] },
  wholeTable: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  zone: { left: 0, position: 'absolute', right: 0 },
  zoneTop: { top: 0 }
})
