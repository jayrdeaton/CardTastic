// Crazy Eights' table, drawn upright for whoever's turn it is (layout.ts): their hand across the bottom, sorted by suit
// with the 8s last, the cards that fit raised on their turn; each other player in a slot across the top, their hand a
// fan of backs; and the stock and the discard between, with the suit to follow under them. A tap on a card that fits
// plays it; an 8 brings up the four suits to name. With nothing to play, the stock glows to draw from; once nothing
// more can be drawn the turn passes by itself. With one person and CPUs, seat 1 always sits at the bottom. With more
// people the phone is passed: when the turn goes to another person every hand turns face down and the pass cover
// (games/table/PassCover.tsx) says who to hand it to and what was played since their last turn. Every card is one view
// the whole time it's on the table (games/table/TableCards.tsx), so a card visibly goes from the stock to a hand to the
// discard.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { useKeepAwake } from '@rific/core'
import { Pressable } from '@rific/feedback-press'
import { type Card, cardColor, CardSizeProvider, rankLabel, type Suit, SUIT_SYMBOLS } from '@tastic/cards'
import { useOverlayCardColors } from '@tastic/hud/chrome'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG, CHROME_FG_MUTED, useTableColors } from '@/components/theme'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { type TablePlayer, tablePlayers } from '@/games/table/extraSeats'
import { cardTilt, type Pose } from '@/games/table/geometry'
import { cardName, HandSuitMarks, suitMarkSpots } from '@/games/table/HandRow'
import { PassCover } from '@/games/table/PassCover'
import { VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { SeatBadge, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { type MatchSeatResult, matchStatsActions } from '@/redux/matchStatsSlice'

import { canDraw, canPass, discardTop, drawLimit, fits, handSizeFor, seatAfter, toMove } from './engine/rules'
import { type EightsState, type EightsTurn } from './engine/types'
import { type EightsLayout, eightsLayout, fanPoses, handPoses } from './layout'
import { type EightsRoundSettings, eightsRules } from './useEightsLoadout'
import { useEightsMatch } from './useEightsMatch'

/** A card's move between two places. */
const MOVE_MS = 300
/** The deal: a card every this often, round the table, then the starter. */
const DEAL_STAGGER_MS = 50
/** The hands lie face up this long before the result shows. */
const RESULT_MS = 1800
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3
/** A hand is sorted by suit in this order (the colors alternate), then by rank, the 8s last. */
const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
const SUIT_NAMES: Record<Suit, string> = { spades: 'Spades', hearts: 'Hearts', clubs: 'Clubs', diamonds: 'Diamonds' }
/** The suit picker's buttons. */
const SUIT_BUTTON = 56

export function CrazyEightsScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { dark } = useAutoPaperTheme()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, playInvalidSound, hapticCard, hapticInvalid } = useCardSoundEffects()

  // The game the setup screen committed (seat 2, seats 3 and 4, the CPUs' level, the rules); a direct link plays the
  // player's own settings, seat 2 the CPU.
  const { mode, settings: round } = useActiveRound<EightsRoundSettings>('crazyeights', { eightsCpu: settings.eightsCpu, eightsSeat3: settings.eightsSeat3, eightsSeat4: settings.eightsSeat4, eightsDraw: settings.eightsDraw, eightsSpecials: settings.eightsSpecials, eightsHand: settings.eightsHand })
  const seat2Person = mode === 'twoPlayer'
  const { seats, statsIds } = useTableSeats(seat2Person)
  const players = useMemo(() => tablePlayers(seats, seat2Person, round.eightsSeat3, round.eightsSeat4, dark), [seats, seat2Person, round.eightsSeat3, round.eightsSeat4, dark])
  const rules = useMemo(() => eightsRules(round), [round])
  const cpus = useMemo(() => players.map((player): CpuLevel | null => (player.kind === 'cpu' ? round.eightsCpu : null)), [players, round.eightsCpu])
  const passAndPlay = players.filter((player) => player.kind === 'person').length > 1

  const [settingsOpen, setSettingsOpen] = useState(false)
  const appActive = useAppActive()
  // Who has the phone: they've tapped Ready on the pass cover (seat 1 starts with it).
  const [holder, setHolder] = useState(0)

  const changed = useCallback(
    (prev: EightsState, next: EightsState) => {
      if (next !== prev) playCardSound()
      if (next.phase === 'over' && prev.phase !== 'over') {
        const winners = next.winners ?? []
        const eights = (i: number) => next.turns.filter((turn) => turn.player === i && turn.played?.rank === 8).length
        const seat = (i: number, player: string | null): MatchSeatResult => ({ player, outcome: winners.includes(i) ? (winners.length > 1 ? 'tied' : 'won') : 'lost', counts: { eights: eights(i) } })
        // Against CPUs alone it's a game against the CPU at their level; with another person at the table, against people.
        const cpuOnly = players.slice(1).every((player) => player.kind === 'cpu')
        dispatch(matchStatsActions.recordMatch({ game: 'crazyeights', cpu: cpuOnly ? round.eightsCpu : null, seats: seat2Person ? [seat(0, statsIds[1]), seat(1, statsIds[2])] : [seat(0, statsIds[1])] }))
      }
    },
    [playCardSound, players, dispatch, round.eightsCpu, seat2Person, statsIds]
  )

  const dealMs = useCallback((current: EightsState) => (reduceMotion ? 0 : dealCount(current) * DEAL_STAGGER_MS + MOVE_MS + 100), [reduceMotion])
  const match = useEightsMatch({ cpus, rules, paused: settingsOpen || !appActive, holder: passAndPlay ? holder : null, dealMs, changed })
  const { state, dealt } = match
  const over = state.phase === 'over'
  const resultShown = useSettled(over ? match.deal : null, reduceMotion ? 300 : RESULT_MS)

  // The table is drawn for whoever's turn it is, or whoever has the phone while a CPU plays, so when the turn passes to
  // another person the table turns to them at once, under the cover, every hand face down; it's theirs once they tap
  // Ready.
  const moving = toMove(state)
  const movingPerson = moving !== null && players[moving].kind === 'person'
  const seated = passAndPlay && movingPerson ? moving : passAndPlay ? holder : 0
  const covered = passAndPlay && movingPerson && moving !== holder
  const layout = useMemo(() => eightsLayout(width, height, insets, players.length), [width, height, insets, players.length])
  const others = useMemo(() => Array.from({ length: players.length - 1 }, (_, k) => (seated + 1 + k) % players.length), [seated, players.length])
  const yourMove = !covered && dealt && !settingsOpen && moving === seated

  const hand = useMemo(() => sortedHand(state.hands[seated]), [state.hands, seated])
  const raised = yourMove && state.phase === 'play'
  const cards = useMemo(() => eightsCards(state, layout, others, hand, covered, raised, !dealt, reduceMotion), [state, layout, others, hand, covered, raised, dealt, reduceMotion])

  const targets: TableTarget[] = []
  if (yourMove && state.phase === 'play') {
    if (canDraw(state, seated))
      targets.push({
        key: 'stock',
        at: layout.stock,
        label: 'Draw from the stock',
        onPress: () => {
          if (match.draw(seated)) hapticCard()
        }
      })
    // Left to right as the hand is laid out (back row first), so each card's target lies over the one before it, as the
    // cards do: a tap on the strip of a card that shows goes to that card.
    const poses = handPoses(hand.length, layout, (i) => fits(state, hand[i]))
    hand.forEach((card, i) => {
      const playable = fits(state, card)
      targets.push({
        key: `card-${card.id}`,
        at: poses[i],
        label: playable ? `Play the ${cardName(card)}` : `The ${cardName(card)} doesn’t fit`,
        glow: false,
        onPress: () => {
          if (playable && match.play(seated, card.id)) hapticCard()
          else {
            playInvalidSound()
            hapticInvalid()
          }
        }
      })
    })
  }

  const name = (player: number) => (!passAndPlay && player === 0 ? 'You' : players[player].seat.name)
  const seatedLabel: TableLabel = { seat: players[seated].seat, subtitle: cardsLeft(state.hands[seated].length), score: null, active: moving === seated }
  const prompts: Partial<Record<1 | 2, string | null>> = {}
  if (over) prompts[1] = overLine(state, name)
  else if (dealt && !covered && moving !== null) prompts[1] = moving === seated ? promptFor(state) : waitingLine(state, seated, players)

  const winners = state.winners ?? []
  const celebrate = passAndPlay ? winners.some((i) => players[i].kind === 'person') : winners.includes(0)
  const emptySlots = state.stock.length === 0 ? [layout.stock] : []

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView
          game='crazyeights'
          layout={layout}
          cards={cards}
          dealKey={match.deal}
          targets={targets}
          labels={{ 1: seatedLabel }}
          prompts={prompts}
          notes={{}}
          call={null}
          emptySlots={emptySlots}
          overCards={
            <>
              {dealt ? <HandSuitMarks game='crazyeights' spots={suitMarkSpots(cards, layout.cardWidth, layout.cardHeight)} cardWidth={layout.cardWidth} /> : null}
              <SuitBanner state={state} layout={layout} players={players} />
              <SlotLabels state={state} layout={layout} others={others} players={players} moving={moving} />
            </>
          }
          onSettings={() => setSettingsOpen(true)}
        >
          {yourMove && state.phase === 'suit' ? (
            <SuitPicker
              y={layout.actionY}
              onPick={(suit) => {
                if (match.name(seated, suit)) hapticCard()
              }}
            />
          ) : null}
          {covered ? <PassCover seat={players[moving!].seat} message={passMessage(state, moving!, players)} onReady={() => setHolder(moving!)} testID='crazyeights-pass' /> : null}
          {resultShown && over ? <TableOverlay humans={VS_CPU_HUMANS} content={() => resultContent(state, players, passAndPlay)} actionLabel='Rematch' onAction={match.rematch} testID='crazyeights-result' /> : null}
          {resultShown && over && celebrate ? <PipFireworks /> : null}
        </TableView>
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
    </CardSizeProvider>
  )
}

/** The cards the deal sends out: every hand, then the starter. */
function dealCount(state: EightsState): number {
  return state.players * handSizeFor(state.rules, state.players) + 1
}

/** A hand as its owner sees it: by suit, then rank, the 8s last (they go on anything). */
function sortedHand(cards: readonly Card[]): Card[] {
  const order = (card: Card) => (card.rank === 8 ? 4 : SUIT_ORDER.indexOf(card.suit))
  return [...cards].sort((a, b) => order(a) - order(b) || a.rank - b.rank || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit))
}

function cardsLeft(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`
}

/** Every card on the table, bottom to top: the stock's top cards, the discard's, the other players' hands, then the
 * seated player's. The deal sends each hand's cards out from the stock round the table from whoever plays first, the
 * starter last. Once the game is over every hand turns face up. */
function eightsCards(state: EightsState, layout: EightsLayout, others: number[], hand: Card[], covered: boolean, raised: boolean, dealing: boolean, reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : MOVE_MS
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const over = state.phase === 'over'
  // The order each card left the stock in the deal: round the table from whoever plays first.
  const dealOrder = new Map<string, number>()
  const size = handSizeFor(state.rules, state.players)
  for (let player = 0; player < state.players; player++) {
    const seat = (player - state.first + state.players) % state.players
    state.hands[player].slice(0, size).forEach((card, i) => dealOrder.set(card.id, i * state.players + seat))
  }
  const dealt = (card: Card, fallback: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: (dealOrder.get(card.id) ?? fallback) * DEAL_STAGGER_MS } : {})

  const cards: TableCardSpec[] = []
  const stock = state.stock.slice(-PILE_DRAWN)
  stock.forEach((card, k) => {
    const depth = stock.length - 1 - k
    cards.push({ card, pose: { x: layout.stock.x + depth * 2.5, y: layout.stock.y + depth * 2.5, rotate: 0 }, faceUp: false, durationMs: move })
  })
  state.discard.slice(-PILE_DRAWN).forEach((card) => cards.push({ card, pose: { ...layout.discard, rotate: cardTilt(card.id, 3) }, faceUp: true, durationMs: move, ...dealt(card, dealCount(state) - 1) }))

  others.forEach((player, k) => {
    const poses = fanPoses(state.hands[player].length, layout.slots[k], layout)
    state.hands[player].forEach((card, i) => cards.push({ card, pose: poses[i], faceUp: over, durationMs: move, ...dealt(card, 0) }))
  })
  if (covered) {
    // Under the pass cover the seated hand lies face down, as a fan across the bottom.
    const span = layout.cardWidth + (hand.length - 1) * layout.backStep
    hand.forEach((card, i) => cards.push({ card, pose: { x: layout.width / 2 - span / 2 + layout.cardWidth / 2 + i * layout.backStep, y: layout.handY, rotate: 0 }, faceUp: false, durationMs: move, ...dealt(card, 0) }))
  } else {
    const poses = handPoses(hand.length, layout, (i) => raised && fits(state, hand[i]))
    hand.forEach((card, i) => cards.push({ card, pose: poses[i], faceUp: true, durationMs: move, ...dealt(card, 0) }))
  }
  return cards
}

/** What a card that fits has to be, as the prompt says it: the suit, the top card's rank (not on an 8), or an 8. */
function fitsLine(state: EightsState): string {
  const top = discardTop(state)
  const suit = SUIT_NAMES[state.suit].toLowerCase().slice(0, -1)
  if (top.rank === 8) return `a ${suit} or an 8`
  const rank = top.rank === 1 ? 'an Ace' : top.rank === 11 ? 'a Jack' : top.rank === 12 ? 'a Queen' : top.rank === 13 ? 'a King' : `a ${rankLabel(top.rank)}`
  return `a ${suit}, ${rank}, or an 8`
}

/** What the prompt over the hand says on the player's own turn. */
function promptFor(state: EightsState): string {
  if (state.phase === 'suit') return 'Name the suit to follow'
  const player = state.turn
  if (canPass(state, player)) return state.drawn > 0 ? 'Still nothing fits: your turn passes' : 'Nothing fits and nothing to draw: your turn passes'
  if (canDraw(state, player)) {
    if (state.drawn === 0) return 'Nothing fits: draw from the stock'
    const limit = drawLimit(state.rules)
    return limit === Infinity ? 'Nothing fits yet: draw again' : `Nothing fits yet: draw again (${state.drawn} of ${limit})`
  }
  return state.drawn > 0 ? `It fits: play ${fitsLine(state)}` : `Play ${fitsLine(state)}`
}

/** The player's most recent turn, if any. */
function lastTurnOf(state: EightsState, player: number): EightsTurn | null {
  for (let i = state.turns.length - 1; i >= 0; i--) if (state.turns[i].player === player) return state.turns[i]
  return null
}

/** The prompt while someone else plays: what a 2 or a Queen just cost the seated player, or whose turn it is. */
function waitingLine(state: EightsState, seated: number, players: TablePlayer[]): string {
  const last = lastTurnOf(state, seated)
  if (last?.lost === 'drawTwo') return `You drew ${last.drew === 1 ? 'one' : 'two'} and lost your turn`
  if (last?.lost === 'skip') return 'You were skipped'
  return `${players[state.turn].seat.name}’s turn`
}

function overLine(state: EightsState, name: (player: number) => string): string {
  const winners = state.winners ?? []
  if (winners.length === 1) return `${name(winners[0])} went out`
  return 'Nobody could play or draw'
}

/** A turn in a slot's last line, short enough for a third of a phone's width. */
function slotLine(turn: EightsTurn | null): string {
  if (!turn) return ' '
  if (turn.lost === 'drawTwo') return `Drew ${turn.drew}, lost a turn`
  if (turn.lost === 'skip') return 'Skipped'
  if (!turn.played) return turn.drew > 0 ? `Drew ${turn.drew}, passed` : 'Passed'
  if (turn.out) return `Out with ${cardName(turn.played)}`
  const played = turn.drew > 0 ? `Drew ${turn.drew}, played ${cardName(turn.played)}` : `Played ${cardName(turn.played)}`
  if (turn.named) return `${played}, named ${SUIT_SYMBOLS[turn.named]}`
  return played
}

/** One turn as the pass cover tells it. */
function turnSentence(turn: EightsTurn, players: TablePlayer[]): string {
  const who = players[turn.player].seat.name
  if (turn.lost === 'drawTwo') return `${who} drew ${turn.drew === 1 ? 'one' : 'two'} and lost a turn.`
  if (turn.lost === 'skip') return `${who} was skipped.`
  const drew = turn.drew > 0 ? `drew ${turn.drew === 1 ? 'a card' : `${turn.drew} cards`} and ` : ''
  if (!turn.played) return `${who} ${drew}passed.`
  const card = cardName(turn.played)
  if (turn.out) return `${who} ${drew}played the ${card} and went out.`
  if (turn.named) return `${who} ${drew}played the ${card} and named ${SUIT_NAMES[turn.named].toLowerCase()}.`
  if (turn.reversed) return players.length === 2 ? `${who} ${drew}played the ${card} and went again.` : `${who} ${drew}played the ${card}: play goes the other way.`
  return `${who} ${drew}played the ${card}.`
}

/** What the pass cover says: everything played since the next player's last turn of their own, which they didn't see;
 * on their first turn, everything so far and the card that started the pile. */
function passMessage(state: EightsState, next: number, players: TablePlayer[]): string {
  let since = state.turns.length
  while (since > 0 && !(state.turns[since - 1].player === next && state.turns[since - 1].lost === null)) since--
  const turns = state.turns.slice(since)
  const told = turns.map((turn) => turnSentence(turn, players))
  if (since === 0) told.unshift(`The ${cardName(state.discard[0])} started the pile.`)
  if (turns.length === 0 && state.turns.length === 0) told.push(`${players[next].seat.name} plays first.`)
  return told.join('\n')
}

/** Under the piles: the suit to follow, and with three or four players, who's next (the way play goes). */
function SuitBanner({ state, layout, players }: { state: EightsState; layout: EightsLayout; players: TablePlayer[] }) {
  if (state.phase === 'over') return null
  const red = cardColor(state.suit) === 'red'
  const naming = state.phase === 'suit'
  const named = !naming && discardTop(state).rank === 8
  const next = state.players > 2 ? players[seatAfter(state, state.turn, state.direction)].seat.name : null
  return (
    <>
      <View pointerEvents='none' style={[styles.bannerLine, { top: layout.suitY - 14 }]} testID='crazyeights-suit'>
        {naming ? (
          <Text variant='titleMedium' style={styles.strong}>
            Naming a suit
          </Text>
        ) : (
          <>
            <Text variant='titleLarge' style={[styles.suitSymbol, red ? styles.redSuit : null]}>
              {SUIT_SYMBOLS[state.suit]}
            </Text>
            <Text variant='titleMedium' style={styles.strong}>
              {named ? `${SUIT_NAMES[state.suit]} named` : SUIT_NAMES[state.suit]}
            </Text>
          </>
        )}
      </View>
      {next ? (
        <View pointerEvents='none' style={[styles.bannerLine, { top: layout.directionY - 10 }]}>
          <Text variant='labelLarge' style={styles.muted} numberOfLines={1}>
            {state.direction === 1 ? `Next: ${next}` : `Next: ${next} (reversed)`}
          </Text>
        </View>
      ) : null}
    </>
  )
}

/** Each other player's name, cards in hand, and what they did last under their fan. */
function SlotLabels({ state, layout, others, players, moving }: { state: EightsState; layout: EightsLayout; others: number[]; players: TablePlayer[]; moving: number | null }) {
  return (
    <>
      {others.map((player, k) => {
        const slot = layout.slots[k]
        return (
          <View key={player} pointerEvents='none' style={[styles.slot, { left: slot.x - slot.width / 2, top: slot.nameY - 9, width: slot.width }]} testID={`crazyeights-slot-${player}`}>
            <View style={styles.slotName}>
              <SeatBadge seat={players[player].seat} />
              <Text variant='labelLarge' style={[styles.flexText, { color: moving === player ? CHROME_FG : CHROME_FG_MUTED }]} numberOfLines={1}>
                {players[player].seat.name}
              </Text>
            </View>
            <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
              {cardsLeft(state.hands[player].length)}
            </Text>
            <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
              {slotLine(lastTurnOf(state, player))}
            </Text>
          </View>
        )
      })}
    </>
  )
}

/** The four suits to name after an 8, over the hand. */
function SuitPicker({ y, onPick }: { y: number; onPick: (suit: Suit) => void }) {
  const { colors } = useAutoPaperTheme()
  const ink = useTableColors()
  return (
    <View pointerEvents='box-none' style={[styles.suitRow, { top: y - SUIT_BUTTON / 2 }]}>
      {SUIT_ORDER.map((suit) => (
        <Pressable key={suit} accessibilityRole='button' accessibilityLabel={SUIT_NAMES[suit]} onPress={() => onPick(suit)} style={[styles.suitButton, { backgroundColor: colors.surface }]} testID={`crazyeights-suit-${suit}`}>
          <Text style={[styles.suitButtonText, { color: cardColor(suit) === 'red' ? ink.textRed : colors.onSurface }]}>{SUIT_SYMBOLS[suit]}</Text>
        </Pressable>
      ))}
    </View>
  )
}

/** Everyone else's cards left under the result, fewest first. */
function Standings({ state, players }: { state: EightsState; players: TablePlayer[] }) {
  const { fg, fgMuted } = useOverlayCardColors()
  const order = state.hands.map((hand, i) => ({ count: hand.length, i })).sort((a, b) => a.count - b.count || a.i - b.i)
  return (
    <View style={styles.standings} testID='crazyeights-standings'>
      {order.map(({ count, i }) => (
        <Text key={i} variant='titleMedium' style={[styles.center, { color: state.winners?.includes(i) ? fg : fgMuted }]}>
          {`${players[i].seat.name} ${count === 0 ? 'out' : cardsLeft(count)}`}
        </Text>
      ))}
    </View>
  )
}

function resultContent(state: EightsState, players: TablePlayer[], passAndPlay: boolean): TableCardContent {
  const winners = state.winners ?? []
  const names = winners.map((i) => players[i].seat.name)
  const youWon = !passAndPlay && winners.includes(0)
  let title: string
  if (winners.length > 1) title = youWon ? 'You Tied for the Win!' : `${names.join(' and ')} Tied`
  else title = youWon ? 'You Won!' : passAndPlay ? `${names[0]} Won!` : `${names[0]} Won`
  const body = winners.length > 1 ? 'Nobody could play or draw, so the fewest cards win.' : 'First out wins.'
  return { icon: passAndPlay || youWon ? 'trophy' : 'cards-outline', title, body, details: <Standings state={state} players={players} /> }
}

const styles = StyleSheet.create({
  bannerLine: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 28, justifyContent: 'center', left: 60, position: 'absolute', right: 60 },
  center: { textAlign: 'center' },
  flexText: { color: CHROME_FG, flexShrink: 1 },
  muted: { color: CHROME_FG_MUTED },
  redSuit: { color: '#FF8A80' },
  screen: { flex: 1 },
  slot: { alignItems: 'center', position: 'absolute' },
  slotName: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 18, justifyContent: 'center', maxWidth: '100%', paddingHorizontal: 4 },
  standings: { alignItems: 'center', gap: 2 },
  strong: { color: CHROME_FG },
  suitButton: { alignItems: 'center', borderRadius: SUIT_BUTTON / 2, elevation: 2, height: SUIT_BUTTON, justifyContent: 'center', width: SUIT_BUTTON },
  suitButtonText: { fontSize: 30, lineHeight: 36 },
  suitRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  suitSymbol: { color: CHROME_FG }
})
