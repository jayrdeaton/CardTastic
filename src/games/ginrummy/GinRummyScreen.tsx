// Gin Rummy's table, drawn upright for whoever's turn it is (layout.ts): their hand across the bottom, arranged into
// its melds (each with a line under it) and then the rest, the other player's face down across the top, and the stock
// and the discard between. Against the CPU, player 1 always sits at the bottom. With two people the phone is passed:
// when the turn goes to the other player, both hands turn face down and the pass cover (games/table/PassCover.tsx) says
// who to hand it to and what was just played; Ready shows the new player their hand. Every card is one view the whole
// time it's on the table (games/table/TableCards.tsx), so a card visibly goes from the stock to a hand to the discard.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { useKeepAwake } from '@rific/core'
import { Button } from '@rific/feedback-press'
import { type Card, CardSizeProvider, rankLabel, SUIT_SYMBOLS } from '@tastic/cards'
import { useOverlayCardColors } from '@tastic/hud/chrome'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG_MUTED, useTableColors } from '@/components/theme'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { CPU_LEVEL_LABELS } from '@/games/table/cpuLevel'
import { cardTilt, type Pose } from '@/games/table/geometry'
import { PassCover } from '@/games/table/PassCover'
import { otherPlayer, type PlayerIndex, VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { bestArrangement } from './engine/melds'
import { canDrawStock, canKnock, canTakeDiscard, canThrow, deadwoodAfterThrow, discardTop, handOf, toMove } from './engine/rules'
import { type GinState, type GinTurn } from './engine/types'
import { type GinLayout, ginLayout, type HandGroup, handPoses, type MeldLine } from './layout'
import { type GinRoundSettings } from './useGinLoadout'
import { useGinMatch } from './useGinMatch'

/** A card's move between two places. */
const MOVE_MS = 300
/** The deal: a card every this often, the players' alternately, then the upcard. */
const DEAL_STAGGER_MS = 45
/** A hand's cards lie face up this long before its result shows. */
const RESULT_MS = 1600
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3
const MELD_LINE_HEIGHT = 3

export function GinRummyScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, hapticCard } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the target); a direct link plays the player's own settings against
  // the CPU.
  const { mode, settings: round } = useActiveRound<GinRoundSettings>('ginrummy', { ginTarget: settings.ginTarget, ginCpu: settings.ginCpu })
  const twoPlayer = mode === 'twoPlayer'
  const cpu = twoPlayer ? null : round.ginCpu
  const { seats, statsIds } = useTableSeats(twoPlayer)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const appActive = useAppActive()

  const changed = useCallback(
    (prev: GinState, next: GinState) => {
      if (next !== prev) playCardSound()
      if (next.phase === 'matchOver' && prev.phase !== 'matchOver') {
        const seat = (player: PlayerIndex) => ({ player: statsIds[player], outcome: next.winner === player ? ('won' as const) : ('lost' as const), counts: { hands: next.handsWon[player - 1], gins: next.gins[player - 1], undercuts: next.undercuts[player - 1] } })
        dispatch(matchStatsActions.recordMatch({ game: 'ginrummy', cpu, seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
      }
    },
    [playCardSound, statsIds, dispatch, cpu, twoPlayer]
  )

  const dealMs = reduceMotion ? 0 : 21 * DEAL_STAGGER_MS + MOVE_MS + 100
  const match = useGinMatch({ target: round.ginTarget, cpu, paused: settingsOpen || !appActive, dealMs, changed })
  const { state, dealt } = match
  const handEnded = state.phase === 'handOver' || state.phase === 'matchOver'
  const resultShown = useSettled(handEnded ? `${match.deal}-${state.hand}` : null, reduceMotion ? 300 : RESULT_MS)

  // Who has the phone: they've tapped Ready on the pass cover (seat 1 starts with it). The table is drawn for whoever's
  // turn it is, so when the turn passes to the other person the table turns to them at once, under the cover, every
  // card face down; it's theirs once they tap Ready. Against the CPU, player 1 always has it.
  const [holder, setHolder] = useState<PlayerIndex>(1)
  const moving = toMove(state)
  const seated: PlayerIndex = twoPlayer ? (moving ?? holder) : 1
  const covered = twoPlayer && moving !== null && moving !== holder
  const layout = useMemo(() => ginLayout(width, height, insets, seated), [width, height, insets, seated])
  const other = otherPlayer(seated)

  // The card picked to throw, for this state only: any move drops it.
  const [pick, setPick] = useState<{ state: GinState; cardId: string } | null>(null)
  const picked = pick?.state === state ? pick.cardId : null
  const yourMove = !covered && dealt && !settingsOpen && moving === seated

  const act = useCallback(
    (done: boolean) => {
      if (done) hapticCard()
    },
    [hapticCard]
  )

  const targets: TableTarget[] = []
  if (yourMove) {
    if (state.phase === 'upcard') targets.push({ key: 'discard', at: layout.discard, label: `Take the ${cardName(discardTop(state)!)}`, onPress: () => act(match.take(seated)) })
    if (state.phase === 'draw') {
      if (canDrawStock(state, seated)) targets.push({ key: 'stock', at: layout.stock, label: 'Draw from the stock', onPress: () => act(match.draw(seated)) })
      if (canTakeDiscard(state, seated)) targets.push({ key: 'discard', at: layout.discard, label: `Take the ${cardName(discardTop(state)!)}`, onPress: () => act(match.take(seated)) })
    }
  }

  const { cards, lines } = useMemo(() => ginCards(state, layout, seated, covered, picked, !dealt, reduceMotion), [state, layout, seated, covered, picked, dealt, reduceMotion])
  if (yourMove && state.phase === 'discard') {
    // Left to right as the hand is laid out, so each card's target lies over the one before it, as the cards do: a tap
    // on the strip of a card that shows goes to that card.
    const inHand = new Map(handOf(state, seated).map((card) => [card.id, card]))
    for (const { card: drawn, pose } of cards) {
      const card = inHand.get(drawn.id)
      if (!card) continue
      targets.push({ key: `card-${card.id}`, at: pose, label: picked === card.id ? `Put back the ${cardName(card)}` : `Pick the ${cardName(card)}`, ring: false, onPress: () => setPick(picked === card.id ? null : { state, cardId: card.id }) })
    }
  }

  const deadwoodNow = (player: PlayerIndex): number => {
    if (handEnded && state.result?.shown) return state.result.shown[player - 1].points
    if (picked && player === seated && canThrow(state, player, picked)) return deadwoodAfterThrow(state, player, picked)
    return bestArrangement(handOf(state, player)).points
  }
  const showsDeadwood = (player: PlayerIndex) => dealt && (handEnded ? !!state.result?.shown : player === seated && !covered)
  const label = (player: PlayerIndex): TableLabel => ({
    seat: seats[player],
    subtitle: showsDeadwood(player) ? `Deadwood ${deadwoodNow(player)}` : player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null,
    score: `${state.scores[player - 1]} of ${state.target}`,
    active: moving === player
  })
  const notes: Partial<Record<PlayerIndex, string | null>> = {}
  notes[seated] = `Hand ${state.hand}`
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  if (dealt && !covered && !handEnded) {
    prompts[seated] = moving === seated ? promptFor(state, picked) : `${seats[other].name}’s turn`
    if (!twoPlayer && state.lastTurn?.player === 2) prompts[2] = turnLine(state.lastTurn)
  }

  // The buttons over the hand: Pass on the first upcard; Throw, and Knock or Gin, once a card is picked.
  const actions: { key: string; label: string; primary: boolean; disabled?: boolean; onPress: () => void }[] = []
  if (yourMove && state.phase === 'upcard') actions.push({ key: 'pass', label: 'Pass', primary: false, onPress: () => act(match.pass(seated)) })
  if (yourMove && state.phase === 'discard' && picked) {
    const throwable = canThrow(state, seated, picked)
    actions.push({ key: 'throw', label: 'Throw', primary: false, disabled: !throwable, onPress: () => act(match.toss(seated, picked)) })
    if (canKnock(state, seated, picked)) actions.push({ key: 'knock', label: deadwoodAfterThrow(state, seated, picked) === 0 ? 'Gin' : 'Knock', primary: true, onPress: () => act(match.knock(seated, picked)) })
  }

  const you = twoPlayer ? null : 1
  const emptySlots = [...(state.stock.length === 0 ? [layout.stock] : []), ...(state.discard.length === 0 ? [layout.discard] : [])]

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView game='ginrummy' layout={layout} cards={cards} dealKey={match.deal} targets={targets} labels={{ 1: label(1), 2: label(2) }} prompts={prompts} notes={notes} call={null} emptySlots={emptySlots} overCards={<MeldLines lines={lines} />} onSettings={() => setSettingsOpen(true)}>
          {actions.length > 0 ? <ActionRow actions={actions} y={layout.actionY} /> : null}
          {covered ? <PassCover seat={seats[moving!]} message={passMessage(state, moving!, seats)} onReady={() => setHolder(moving!)} testID='ginrummy-pass' /> : null}
          {resultShown && state.phase === 'handOver' ? <TableOverlay humans={VS_CPU_HUMANS} content={() => handContent(state, you, seats)} actionLabel='Next Hand' onAction={match.nextHand} testID='ginrummy-hand' /> : null}
          {resultShown && state.phase === 'matchOver' ? <TableOverlay humans={VS_CPU_HUMANS} content={() => matchContent(state, you, seats)} actionLabel='Rematch' onAction={match.rematch} testID='ginrummy-result' /> : null}
          {resultShown && state.phase === 'matchOver' && (twoPlayer || state.winner === 1) ? <PipFireworks /> : null}
        </TableView>
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} rotation={0} />
    </CardSizeProvider>
  )
}

/** A card as a prompt names it: 7♦, Q♠. */
function cardName(card: Card): string {
  return `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`
}

/** A hand's groups as it's laid out: its melds, then (once the hand is over) the cards laid off, then the rest. */
function handGroups(state: GinState, player: PlayerIndex): HandGroup[] {
  const shown = state.result?.shown?.[player - 1]
  const arrangement = shown ?? bestArrangement(handOf(state, player))
  return [...arrangement.melds.map((meld): HandGroup => ({ cards: meld.cards, kind: 'meld' })), { cards: shown?.laidOff ?? [], kind: 'laidOff' }, { cards: arrangement.deadwood, kind: 'loose' }]
}

/** Every card on the table, bottom to top: the stock's top cards, the discard's, the hand at the top, then the hand at
 * the bottom. A deal sends each hand's cards out from the stock in turn, the upcard last. Also the lines under the
 * melds of every hand showing its face. */
function ginCards(state: GinState, layout: GinLayout, seated: PlayerIndex, covered: boolean, picked: string | null, dealing: boolean, reduceMotion: boolean): { cards: TableCardSpec[]; lines: (MeldLine & { y: number })[] } {
  const move = reduceMotion ? 0 : MOVE_MS
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const handEnded = state.phase === 'handOver' || state.phase === 'matchOver'
  // The order each card left the stock in the deal: the hands' cards alternately, from the non-dealer's first.
  const dealOrder = new Map<string, number>()
  const nonDealer = otherPlayer(state.dealer)
  handOf(state, nonDealer).forEach((card, i) => dealOrder.set(card.id, i * 2))
  handOf(state, state.dealer).forEach((card, i) => dealOrder.set(card.id, i * 2 + 1))
  const dealt = (card: Card, fallback: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: (dealOrder.get(card.id) ?? fallback) * DEAL_STAGGER_MS } : {})

  const cards: TableCardSpec[] = []
  const lines: (MeldLine & { y: number })[] = []
  const stock = state.stock.slice(-PILE_DRAWN)
  stock.forEach((card, k) => {
    const depth = stock.length - 1 - k
    cards.push({ card, pose: { x: layout.stock.x + depth * 2.5, y: layout.stock.y + depth * 2.5, rotate: 0 }, faceUp: false, durationMs: move })
  })
  state.discard.slice(-PILE_DRAWN).forEach((card) => cards.push({ card, pose: { ...layout.discard, rotate: cardTilt(card.id, 3) }, faceUp: card.faceUp, durationMs: move, ...dealt(card, 20) }))

  for (const player of [otherPlayer(seated), seated]) {
    const faceUp = handEnded || (player === seated && !covered)
    const groups = faceUp ? handGroups(state, player) : [{ cards: handOf(state, player), kind: 'loose' as const }]
    const spacing = faceUp ? { step: layout.handStep, gap: layout.groupGap } : { step: layout.backStep, gap: 0 }
    const { poses, lines: handLines } = handPoses(groups, layout, player, spacing, player === seated ? picked : null)
    for (const group of groups) for (const card of group.cards) cards.push({ card, pose: poses.get(card.id)!, faceUp, durationMs: move, ...dealt(card, 0) })
    if (faceUp) for (const line of handLines) lines.push({ ...line, y: layout.meldLineY[player] })
  }
  return { cards, lines }
}

/** The line under each meld of a hand showing its face: the hint ring's color under a meld, muted under the cards laid
 * off on the knocker's melds. */
function MeldLines({ lines }: { lines: (MeldLine & { y: number })[] }) {
  const ringColor = useTableColors().hintGreen
  return (
    <>
      {lines.map(({ kind, left, right, y }) => (
        <View key={`${kind}-${left}-${y}`} pointerEvents='none' style={[styles.meldLine, { backgroundColor: kind === 'meld' ? ringColor : CHROME_FG_MUTED, left: left + 2, top: y - MELD_LINE_HEIGHT / 2, width: Math.max(0, right - left - 4) }]} testID={`ginrummy-${kind}-line`} />
      ))}
    </>
  )
}

/** The buttons over the hand: centered in a row. */
function ActionRow({ actions, y }: { actions: { key: string; label: string; primary: boolean; disabled?: boolean; onPress: () => void }[]; y: number }) {
  const { colors } = useAutoPaperTheme()
  return (
    <View pointerEvents='box-none' style={[styles.actions, { top: y - 20 }]}>
      {actions.map(({ key, label, primary, disabled, onPress }) => (
        <Button key={key} mode='contained' compact disabled={disabled} onPress={onPress} buttonColor={primary ? colors.primary : colors.surface} textColor={primary ? colors.onPrimary : colors.onSurface} style={styles.action} testID={`ginrummy-${key}`}>
          {label}
        </Button>
      ))}
    </View>
  )
}

/** What the prompt over the hand says on the player's own turn. */
function promptFor(state: GinState, picked: string | null): string {
  const top = discardTop(state)
  if (state.phase === 'upcard') return top ? `Take the ${cardName(top)}, or pass` : 'Pass'
  if (state.phase === 'draw') return canTakeDiscard(state, state.turn) ? 'Draw from the stock, or take the discard' : 'Draw from the stock'
  if (!picked) return 'Pick a card to throw'
  const card = handOf(state, state.turn).find((c) => c.id === picked)
  if (!card) return 'Pick a card to throw'
  if (!canThrow(state, state.turn, picked)) return `You just took the ${cardName(card)}: pick another`
  if (!canKnock(state, state.turn, picked)) return `Throw the ${cardName(card)}`
  return deadwoodAfterThrow(state, state.turn, picked) === 0 ? `Throw the ${cardName(card)} and go gin` : `Throw the ${cardName(card)}, or knock with it`
}

/** The CPU's last turn, under its hand. */
function turnLine(turn: GinTurn): string | null {
  if (turn.took === 'pass') return turn.card ? `Passed on the ${cardName(turn.card)}` : null
  const drew = turn.took === 'discard' && turn.card ? `Took the ${cardName(turn.card)}` : 'Drew from the stock'
  return turn.threw ? `${drew}, threw the ${cardName(turn.threw)}` : drew
}

/** What the pass cover says: what the player before did, which the next one didn't see; or, at a new hand, who's first. */
function passMessage(state: GinState, next: PlayerIndex, seats: Record<PlayerIndex, Seat>): string {
  const last = state.lastTurn
  if (!last || last.player === next) return state.hand === 1 ? `${seats[next].name} plays first.` : `Hand ${state.hand}: ${seats[next].name} plays first.`
  const who = seats[last.player].name
  if (last.took === 'pass') return last.card ? `${who} passed on the ${cardName(last.card)}.` : `${who} passed.`
  const drew = last.took === 'discard' && last.card ? `took the ${cardName(last.card)}` : 'drew from the stock'
  return last.threw ? `${who} ${drew} and threw the ${cardName(last.threw)}.` : `${who} ${drew}.`
}

/** Who a result names: You against the CPU (`you`), or each player by name with two people sharing the phone. */
function namer(you: PlayerIndex | null, seats: Record<PlayerIndex, Seat>) {
  const name = (player: PlayerIndex) => (player === you ? 'You' : seats[player].name)
  const scores = (player: PlayerIndex, points: number) => `${name(player)} ${player === you ? 'score' : 'scores'} ${points}`
  return { name, scores }
}

/** The match's scores under a result. */
function ScoreLines({ state, seats }: { state: GinState; seats: Record<PlayerIndex, Seat> }) {
  const { fg, fgMuted } = useOverlayCardColors()
  return (
    <View style={styles.scores} testID='ginrummy-scores'>
      <Text variant='titleMedium' style={[styles.center, { color: fg }]}>
        {`${seats[1].name} ${state.scores[0]}  ·  ${seats[2].name} ${state.scores[1]}`}
      </Text>
      <Text variant='bodyMedium' style={[styles.center, { color: fgMuted }]}>{`First to ${state.target}`}</Text>
    </View>
  )
}

/** What the hand's result says. */
function handSummary(state: GinState, you: PlayerIndex | null, seats: Record<PlayerIndex, Seat>): { title: string; body: string } {
  const result = state.result!
  const { name, scores } = namer(you, seats)
  if (result.ending === 'wash' || result.knocker === null || !result.shown) return { title: 'No Winner', body: 'The stock ran down to two cards, so the hand is a draw.' }
  const knocker = result.knocker
  const defender = otherPlayer(knocker)
  const knockerPoints = result.shown[knocker - 1].points
  const defence = result.shown[defender - 1]
  const laid = defence.laidOff.length
  const after = laid > 0 ? ` after laying off ${laid === 1 ? '1 card' : `${laid} cards`}` : ''
  if (result.ending === 'gin') return { title: knocker === you ? 'You Went Gin!' : `${name(knocker)} Went Gin`, body: `${name(knocker)} melded every card. ${name(defender)} had ${defence.points}. ${scores(knocker, result.points)}, with 25 for gin.` }
  if (result.ending === 'undercut') return { title: defender === you ? 'You Undercut!' : `${name(defender)} Undercut`, body: `${name(knocker)} knocked with ${knockerPoints}. ${name(defender)} had ${defence.points}${after}. ${scores(defender, result.points)}, with 25 for the undercut.` }
  return { title: knocker === you ? 'You Knocked' : `${name(knocker)} Knocked`, body: `${name(knocker)} knocked with ${knockerPoints}. ${name(defender)} had ${defence.points}${after}. ${scores(knocker, result.points)}.` }
}

function handContent(state: GinState, you: PlayerIndex | null, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const { title, body } = handSummary(state, you, seats)
  const scorer = state.result?.scorer ?? null
  return { icon: scorer === null ? 'cards-outline' : scorer === you || you === null ? 'cards' : 'cards-outline', title, body, details: <ScoreLines state={state} seats={seats} /> }
}

function matchContent(state: GinState, you: PlayerIndex | null, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = state.winner!
  const { body } = handSummary(state, you, seats)
  const title = winner === you ? 'You Won!' : you === null ? `${seats[winner].name} Won!` : `${seats[winner].name} Won`
  return { icon: winner === you || you === null ? 'trophy' : 'cards-outline', title, body, details: <ScoreLines state={state} seats={seats} /> }
}

const styles = StyleSheet.create({
  action: { minWidth: 96 },
  actions: { flexDirection: 'row', gap: 12, height: 40, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  center: { textAlign: 'center' },
  meldLine: { borderRadius: MELD_LINE_HEIGHT / 2, height: MELD_LINE_HEIGHT, position: 'absolute' },
  scores: { alignItems: 'center', gap: 2 },
  screen: { flex: 1 }
})
