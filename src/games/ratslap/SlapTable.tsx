// The slap games' table: RatSlap's, and Slapjack's (the same game under SLAPJACK_RULES). Not GameChrome: the table never
// turns with the phone (it lies flat between two players at its short edges), so it lays itself out in plain screen
// coordinates (layout.ts) and moves its own cards (games/table/TableCards.tsx). Player 1 sits at the bottom; player 2,
// or the CPU, at the top. A tap on your own deck plays your top card; any other tap on your side is a slap, and against
// the CPU the whole table is yours.

import { useKeepAwake } from '@rific/core'
import { type AnyCard, CardSizeProvider, isJoker, rankLabel } from '@tastic/cards'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native'
import { Icon, Text } from 'react-native-paper'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { EmptySlot, PlayingCard } from '@/components/PlayingCard'
import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG, CHROME_FG_MUTED } from '@/components/theme'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { CPU_LEVEL_LABELS, type CpuLevel } from '@/games/table/cpuLevel'
import { inRect, type Point, type Pose } from '@/games/table/geometry'
import { PileGlow, usePileGlowPulse } from '@/games/table/PileGlow'
import { TWO_PLAYER_HUMANS, VS_CPU_HUMANS } from '@/games/table/players'
import { QuitMatchDialog, useQuitMatch } from '@/games/table/QuitMatch'
import { TableCards, type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, SeatBadge, TableOverlay, TableSideButtons, useAppActive, useFaceToFace, useTableSeats } from '@/games/table/TableChrome'
import { TouchZones } from '@/games/table/TouchZones'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { chancesFor, otherPlayer, toPlay } from './engine/rules'
import { type PlayerIndex, type RatSlapRules, type RatSlapState } from './engine/types'
import { burnedPose, DECK_LABEL_ROOM, deckPose, halfAt, PILE_DRAWN, pileCardPose, slapArea, type TableLayout, tableLayout } from './layout'
import { useRatSlapMatch } from './useRatSlapMatch'

/** A card played onto the pile, or burned under it, and the fan making room for it. */
export const PLAY_MOVE_MS = 240
/** A won pile carried to its winner. */
export const COLLECT_MOVE_MS = 380

/** How many burned cards are drawn: they all lie in one spot, so the newest and the one it covers. */
const BURNED_DRAWN = 2
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

type Call = { player: PlayerIndex; text: string; key: number }
/** Cards on their way to a player's deck: a won pile (the cards drawn when it was won, bottom to top), or a card given
 * for a wrong slap, which starts over the slapper's deck (`from`). */
type Departure = { key: number; player: PlayerIndex; cards: AnyCard[]; from?: Pose }
/** A hand drawn where a slap landed. */
type SlapMark = { key: number; x: number; y: number; upsideDown: boolean }

/** One slap game's table, on the rules and seat 2 its setup screen committed. */
/** `nextRules`: a Rematch's rules, taken from Settings as they are when it's pressed (games/table/useNextRound.ts). */
export function SlapTable({ game, twoPlayer, rules, nextRules, cpu }: { game: 'ratslap' | 'slapjack'; twoPlayer: boolean; rules: RatSlapRules; nextRules: () => RatSlapRules; cpu: CpuLevel | null }) {
  useKeepAwake('game')
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

  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { seats, statsIds } = useTableSeats(twoPlayer)
  // Player 2's side turned to face them: 2 Player on a phone or tablet only. At a computer it's upright, as against the CPU, and the
  // halves still split the table top and bottom for each person's taps (TouchZones).
  const faceToFace = useFaceToFace(twoPlayer)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const quit = useQuitMatch()
  // Settings or Quit Match? is up: the table holds.
  const dialogOpen = settingsOpen || quit.asking
  const appActive = useAppActive()
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
    paused: dialogOpen || !appActive || resultShown,
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
      paid: (player, card) => {
        slapsRef.current[player].wrong++
        playInvalidSound()
        if (humans.includes(player)) hapticInvalid()
        else markCpuSlap()
        showCall(player, 'Wrong slap')
        // The card goes face down from the slapper's deck to the bottom of the other's.
        if (!reduceMotion) setDepartures((current) => [...current, { key: seq.current++, player: otherPlayer(player), cards: [card], from: deckPose(layoutRef.current, player) }])
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
        const seat = (player: PlayerIndex) => ({ player: statsIds[player], outcome: winner === player ? ('won' as const) : ('lost' as const), counts: { slapsWon: slapsRef.current[player].won, wrongSlaps: slapsRef.current[player].wrong } })
        dispatch(matchStatsActions.recordMatch({ game, cpu, seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
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
  const handleTouch = useCallback(
    (player: PlayerIndex, x: number, y: number) => {
      const table = layoutRef.current
      const point = { x, y }
      if (humans.length === 2 && halfAt(point, table) !== player) return
      if (inRect(point, table.deckTargets[player])) {
        if (play(player)) hapticCard()
        else hapticInvalid()
        return
      }
      markSlap(point, faceToFace && player === 2)
      if (slap(player) === 'won') hapticCard()
    },
    [humans, faceToFace, play, slap, markSlap, hapticCard, hapticInvalid]
  )
  const enabled = !dialogOpen && !resultShown && state.winner === null

  const rematch = useCallback(() => {
    setResultShown(false)
    setMatchOver(false)
    slapsRef.current = { 1: { won: 0, wrong: 0 }, 2: { won: 0, wrong: 0 } }
    setOrigins(new Map())
    setDepartures([])
    setMarks([])
    newDeal(nextRules())
  }, [newDeal, nextRules])

  const glowPulse = usePileGlowPulse()
  const tableCards = useMemo(() => tableCardSpecs(state, layout, origins, departures, reduceMotion), [state, layout, origins, departures, reduceMotion])

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={handleLayout}>
        {humans.map((player) => (
          <SlapLabel key={player} game={game} layout={layout} player={player} upsideDown={faceToFace && player === 2} hidden={call?.player === player} />
        ))}
        {state.pile.length === 0 && state.burned.length === 0 ? <EmptySlot style={[styles.pileSlot, { left: layout.center.x - layout.cardWidth / 2, top: layout.center.y - layout.cardHeight / 2 }]} /> : null}
        {/* The deck whose turn it is glows, under every card: its own backs and a card sliding out from under it. */}
        {([1, 2] as const).map((player) => (toPlay(state) === player && state.hands[player - 1].length > 0 ? <PileGlow key={player} at={layout.decks[player]} cardWidth={layout.cardWidth} cardHeight={layout.cardHeight} pulse={glowPulse} testID={`${game}-glow-${player}`} /> : null))}
        <TableCards cards={tableCards} cardWidth={layout.cardWidth} cardHeight={layout.cardHeight} testID={`${game}-pile`} />
        {([1, 2] as const).map((player) => (
          <DeckArea key={player} game={game} player={player} state={state} layout={layout} seat={seats[player]} subtitle={player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null} upsideDown={faceToFace && player === 2} />
        ))}
        {marks.map((mark) => (
          <SlapMarkView key={mark.key} mark={mark} />
        ))}
        {call ? <CallText call={call} layout={layout} upsideDown={faceToFace} /> : null}

        <TouchZones testID={game} twoPlayer={twoPlayer} splitY={layout.center.y} height={layout.height} enabled={enabled} onTouch={handleTouch} />

        <TableSideButtons y={layout.center.y} onSettings={() => setSettingsOpen(true)} />

        {resultShown && state.winner !== null ? <TableOverlay humans={humans} content={(viewer) => resultContent(viewer, state.winner!, seats)} actionLabel='Rematch' onAction={rematch} testID={`${game}-result`} /> : null}
        {resultShown && state.winner !== null && humans.includes(state.winner) ? <PipFireworks /> : null}
      </View>
      <QuitMatchDialog quit={quit} state={state} over={state.winner !== null} />
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
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
    for (const card of departure.cards) if (!live.has(card.id)) specs.push({ card, pose, faceUp: false, from: departure.from, durationMs: COLLECT_MOVE_MS })
  }
  const burnedAt = burnedPose(layout, state.pile.length)
  for (const card of burned) specs.push({ card, pose: burnedAt, faceUp: true, dimmed: true, from: origins.get(card.id), durationMs: move })
  pile.forEach((card, i) => specs.push({ card, pose: pileCardPose(layout, pile.length - 1 - i, state.pile.length, card.id), faceUp: true, from: origins.get(card.id), durationMs: move }))
  return specs
}

/** The felt between the pile and a player's deck says where to slap. */
function SlapLabel({ game, layout, player, upsideDown, hidden }: { game: string; layout: TableLayout; player: PlayerIndex; upsideDown: boolean; hidden: boolean }) {
  const area = slapArea(layout, player)
  if (area.height < SLAP_LABEL_HEIGHT) return null
  return (
    <View pointerEvents='none' style={[styles.slapLabel, { height: SLAP_LABEL_HEIGHT, top: area.y - SLAP_LABEL_HEIGHT / 2 }, upsideDown && styles.flipped, hidden && styles.hidden]} testID={`${game}-slap-label-${player}`}>
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

/** A player's deck near their own edge, with their name and card count, and the challenge they face (the glow under
 * it while it's theirs to play is the table's, drawn under the cards). Out of cards, an empty slot: they can still slap back in. */
function DeckArea({ game, player, state, layout, seat, subtitle, upsideDown }: { game: string; player: PlayerIndex; state: RatSlapState; layout: TableLayout; seat: Seat; subtitle: string | null; upsideDown: boolean }) {
  const deck = layout.decks[player]
  const count = state.hands[player - 1].length
  const challenge = state.challenge?.defender === player ? state.challenge : null
  const triesLeft = challenge ? challenge.requiredChances - challenge.chancesUsed : 0
  const cardStyle: ViewStyle = { left: deck.x - layout.cardWidth / 2, position: 'absolute', top: deck.y - layout.cardHeight / 2 }
  // Labels sit on the outside of the deck, toward the player's own edge, and read the right way up for them.
  const labelTop = player === 1 ? deck.y + layout.cardHeight / 2 + 6 : deck.y - layout.cardHeight / 2 - DECK_LABEL_ROOM
  const challengeTop = player === 1 ? deck.y - layout.cardHeight / 2 - DECK_LABEL_ROOM : deck.y + layout.cardHeight / 2 + 6
  const flip: ViewStyle = upsideDown ? { transform: [{ rotate: '180deg' }] } : {}
  const top = state.hands[player - 1][count - 1]
  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill} testID={`${game}-deck-${player}`}>
      {count > 0 && top ? (
        <>
          {count > 2 ? <PlayingCard card={{ ...top, id: `${top.id}-under-2`, faceUp: false }} disabled style={[cardStyle, styles.under2]} /> : null}
          {count > 1 ? <PlayingCard card={{ ...top, id: `${top.id}-under-1`, faceUp: false }} disabled style={[cardStyle, styles.under1]} /> : null}
          <PlayingCard card={{ ...top, faceUp: false }} disabled style={cardStyle} />
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
        <Text variant='labelLarge' style={styles.count} testID={`${game}-count-${player}`}>
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

/** The match's result, as each person reads it. */
function resultContent(viewer: PlayerIndex, winner: PlayerIndex, seats: Record<PlayerIndex, Seat>) {
  const won = viewer === winner
  return won ? { icon: 'trophy', title: 'You Won!', body: 'Every card is yours.' } : { icon: 'cards-outline', title: `${seats[winner].name} Won`, body: `${seats[winner].name} took every card.` }
}

const styles = StyleSheet.create({
  call: { alignItems: 'center', left: 0, position: 'absolute', right: 0 },
  callText: { color: CHROME_FG, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  challenge: { color: CHROME_FG },
  count: { color: CHROME_FG_MUTED, minWidth: 28, textAlign: 'right' },
  flipped: { transform: [{ rotate: '180deg' }] },
  hidden: { opacity: 0 },
  label: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', left: 0, paddingHorizontal: 24, position: 'absolute', right: 0 },
  labelText: { color: CHROME_FG, flexShrink: 1 },
  pileSlot: { position: 'absolute' },
  screen: { flex: 1 },
  slapLabel: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  slapLabelText: { color: SLAP_LABEL_COLOR },
  slapMark: { alignItems: 'center', height: SLAP_MARK_SIZE, justifyContent: 'center', position: 'absolute', width: SLAP_MARK_SIZE },
  subtitle: { color: CHROME_FG_MUTED },
  under1: { transform: [{ translateX: 2.5 }, { translateY: 2.5 }] },
  under2: { transform: [{ translateX: 5 }, { translateY: 5 }] }
})
