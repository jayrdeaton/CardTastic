// Gin Rummy's table, drawn upright for whoever's turn it is (layout.ts): their hand across the bottom, arranged into
// its melds (each with a line under it) and then the rest, the other player's face down across the top, and the stock
// and the discard between. Against the CPU, player 1 always sits at the bottom. With two people the phone is passed:
// when the turn goes to the other player, both hands turn face down and the pass cover (games/table/PassCover.tsx) says
// who to hand it to and what was just played; Ready shows the new player their hand. Every card is one view the whole
// time it's on the table (games/table/TableCards.tsx), so a card visibly goes from the stock to a hand to the discard.

import { useKeepAwake } from '@rific/core'
import { type AnyCard, CardSizeProvider, type Suit } from '@tastic/cards'
import { useOverlayCardColors } from '@tastic/hud/chrome'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { CPU_LEVEL_LABELS } from '@/games/table/cpuLevel'
import { cardTilt, type Pose } from '@/games/table/geometry'
import { ActionRow, cardName, type HandAction, type HandGroup, HandSuitMarks, type MeldLine, MeldLines, suitMarkSpots } from '@/games/table/HandRow'
import { PassCover } from '@/games/table/PassCover'
import { otherPlayer, type PlayerIndex, VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { bestArrangement } from './engine/melds'
import { canBigGin, canDrawStock, canKnock, canTakeDiscard, canThrow, deadwoodAfterThrow, discardTop, handOf, isDoubled, knockLimit, toMove } from './engine/rules'
import { GIN_BONUSES, type GinHelp, type GinState, type GinTarget, type GinTurn, KNOCK_LIMIT } from './engine/types'
import { type GinLayout, ginLayout, handPoses } from './layout'
import { type GinRoundSettings, ginRules } from './useGinLoadout'
import { useGinMatch } from './useGinMatch'

/** A card's move between two places. */
const MOVE_MS = 300
/** The deal: a card every this often, the players' alternately, then the upcard. */
const DEAL_STAGGER_MS = 45
/** A hand's cards lie face up this long before its result shows. */
const RESULT_MS = 1600
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3
/** Without the meld help, a hand is sorted by suit in this order (the colors alternate), then by rank. */
const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

export function GinRummyScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, playInvalidSound, hapticCard, hapticInvalid } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the rules, the help); a direct link plays the player's own settings
  // against the CPU.
  const { mode, settings: round } = useActiveRound<GinRoundSettings>('ginrummy', { ginTarget: settings.ginTarget, ginKnock: settings.ginKnock, ginBonus: settings.ginBonus, ginHelp: settings.ginHelp, ginCpu: settings.ginCpu })
  const rules = useMemo(() => ginRules(round), [round])
  const help = round.ginHelp
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
  const match = useGinMatch({ rules, cpu, paused: settingsOpen || !appActive, dealMs, changed })
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
  // Without the meld help a knock can be tried with too much deadwood: why it was refused, for this pick only.
  const [refused, setRefused] = useState<{ state: GinState; cardId: string; text: string } | null>(null)
  const refusal = refused?.state === state && refused.cardId === picked ? refused.text : null
  const yourMove = !covered && dealt && !settingsOpen && moving === seated

  const act = useCallback(
    (done: boolean): boolean => {
      if (done) hapticCard()
      return done
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

  const { cards, lines } = useMemo(() => ginCards(state, layout, seated, covered, picked, !dealt, reduceMotion, help), [state, layout, seated, covered, picked, dealt, reduceMotion, help])
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
  // The count shows once a hand is laid down, and (unless the help is off) on the seated player's own hand.
  const showsDeadwood = (player: PlayerIndex) => dealt && (handEnded ? !!state.result?.shown : player === seated && !covered && help !== 'none')
  const label = (player: PlayerIndex): TableLabel => ({
    seat: seats[player],
    subtitle: showsDeadwood(player) ? `Deadwood ${deadwoodNow(player)}` : player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null,
    score: rules.target === 1 ? String(state.scores[player - 1]) : `${state.scores[player - 1]} of ${rules.target}`,
    active: moving === player
  })
  const notes: Partial<Record<PlayerIndex, string | null>> = {}
  notes[seated] = handNote(state)
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  if (dealt && !covered && !handEnded) {
    prompts[seated] = moving === seated ? (refusal ?? promptFor(state, picked, help)) : `${seats[other].name}’s turn`
    if (!twoPlayer && state.lastTurn?.player === 2) prompts[2] = turnLine(state.lastTurn)
  }

  // The buttons over the hand: Pass on the first upcard; Big Gin when all eleven cards meld; Throw, and Knock or Gin,
  // once a card is picked. Without the meld help, Knock shows for any card and says why when it's refused.
  const actions: HandAction[] = []
  if (yourMove && state.phase === 'upcard') actions.push({ key: 'pass', label: 'Pass', primary: false, onPress: () => act(match.pass(seated)) })
  if (yourMove && state.phase === 'discard' && help !== 'none' && canBigGin(state, seated)) actions.push({ key: 'biggin', label: 'Big Gin', primary: true, onPress: () => act(match.bigGin(seated)) })
  if (yourMove && state.phase === 'discard' && picked) {
    const throwable = canThrow(state, seated, picked)
    actions.push({ key: 'throw', label: 'Throw', primary: false, disabled: !throwable, onPress: () => act(match.toss(seated, picked)) })
    if (help === 'none' && throwable)
      actions.push({
        key: 'knock',
        label: 'Knock',
        primary: true,
        onPress: () => {
          if (act(match.knock(seated, picked))) return
          playInvalidSound()
          hapticInvalid()
          setRefused({ state, cardId: picked, text: knockRefusal(state, seated, picked) })
        }
      })
    else if (canKnock(state, seated, picked)) actions.push({ key: 'knock', label: deadwoodAfterThrow(state, seated, picked) === 0 ? 'Gin' : 'Knock', primary: true, onPress: () => act(match.knock(seated, picked)) })
  }
  // Without the meld help, Big Gin is laid down like a knock: tried, and refused if the cards don't all meld.
  if (yourMove && state.phase === 'discard' && help === 'none' && GIN_BONUSES[rules.bonus].bigGin !== null && !picked)
    actions.push({
      key: 'biggin',
      label: 'Big Gin',
      primary: false,
      onPress: () => {
        if (act(match.bigGin(seated))) return
        playInvalidSound()
        hapticInvalid()
      }
    })

  const you = twoPlayer ? null : 1
  const emptySlots = [...(state.stock.length === 0 ? [layout.stock] : []), ...(state.discard.length === 0 ? [layout.discard] : [])]

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView
          game='ginrummy'
          layout={layout}
          cards={cards}
          dealKey={match.deal}
          targets={targets}
          labels={{ 1: label(1), 2: label(2) }}
          prompts={prompts}
          notes={notes}
          call={null}
          emptySlots={emptySlots}
          overCards={
            <>
              <MeldLines game='ginrummy' lines={lines} />
              {dealt ? <HandSuitMarks game='ginrummy' spots={suitMarkSpots(cards, layout.cardWidth, layout.cardHeight)} cardWidth={layout.cardWidth} /> : null}
            </>
          }
          onSettings={() => setSettingsOpen(true)}
        >
          {actions.length > 0 ? <ActionRow game='ginrummy' actions={actions} y={layout.actionY} /> : null}
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

/** A hand's groups as it's laid out: its melds, then (once the hand is over) the cards laid off, then the rest. Without
 * the meld help, a hand in play is one row sorted by suit and rank, for its owner to read. */
function handGroups(state: GinState, player: PlayerIndex, help: GinHelp): HandGroup[] {
  const shown = state.result?.shown?.[player - 1]
  if (!shown && help !== 'full') return [{ cards: [...handOf(state, player)].sort((a, b) => SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) || a.rank - b.rank), kind: 'loose' }]
  const arrangement = shown ?? bestArrangement(handOf(state, player))
  return [...arrangement.melds.map((meld): HandGroup => ({ cards: meld.cards, kind: 'meld' })), { cards: shown?.laidOff ?? [], kind: 'laidOff' }, { cards: arrangement.deadwood, kind: 'loose' }]
}

/** Every card on the table, bottom to top: the stock's top cards, the discard's, the hand at the top, then the hand at
 * the bottom. A deal sends each hand's cards out from the stock in turn, the upcard last. Also the lines under the
 * melds of every hand showing its face. */
function ginCards(state: GinState, layout: GinLayout, seated: PlayerIndex, covered: boolean, picked: string | null, dealing: boolean, reduceMotion: boolean, help: GinHelp): { cards: TableCardSpec[]; lines: (MeldLine & { y: number })[] } {
  const move = reduceMotion ? 0 : MOVE_MS
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const handEnded = state.phase === 'handOver' || state.phase === 'matchOver'
  // The order each card left the stock in the deal: the hands' cards alternately, from the non-dealer's first.
  const dealOrder = new Map<string, number>()
  const nonDealer = otherPlayer(state.dealer)
  handOf(state, nonDealer).forEach((card, i) => dealOrder.set(card.id, i * 2))
  handOf(state, state.dealer).forEach((card, i) => dealOrder.set(card.id, i * 2 + 1))
  const dealt = (card: AnyCard, fallback: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: (dealOrder.get(card.id) ?? fallback) * DEAL_STAGGER_MS } : {})

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
    const groups = faceUp ? handGroups(state, player, help) : [{ cards: handOf(state, player), kind: 'loose' as const }]
    const spacing = faceUp ? { step: layout.handStep, gap: layout.groupGap } : { step: layout.backStep, gap: 0 }
    const { poses, lines: handLines } = handPoses(groups, layout, player, spacing, player === seated ? picked : null)
    for (const group of groups) for (const card of group.cards) cards.push({ card, pose: poses.get(card.id)!, faceUp, durationMs: move, ...dealt(card, 0) })
    if (faceUp) for (const line of handLines) lines.push({ ...line, y: layout.meldLineY[player] })
  }
  return { cards, lines }
}

/** What the prompt over the hand says on the player's own turn. */
function promptFor(state: GinState, picked: string | null, help: GinHelp): string {
  const top = discardTop(state)
  if (state.phase === 'upcard') return top ? `Take the ${cardName(top)}, or pass` : 'Pass'
  if (state.phase === 'draw') return canTakeDiscard(state, state.turn) ? 'Draw from the stock, or take the discard' : 'Draw from the stock'
  if (!picked) return help !== 'none' && canBigGin(state, state.turn) ? 'Every card melds: go Big Gin' : 'Pick a card to throw'
  const card = handOf(state, state.turn).find((c) => c.id === picked)
  if (!card) return 'Pick a card to throw'
  if (!canThrow(state, state.turn, picked)) return `You just took the ${cardName(card)}: pick another`
  if (help === 'none') return `Throw the ${cardName(card)}, or knock with it`
  if (!canKnock(state, state.turn, picked)) return `Throw the ${cardName(card)}`
  return deadwoodAfterThrow(state, state.turn, picked) === 0 ? `Throw the ${cardName(card)} and go gin` : `Throw the ${cardName(card)}, or knock with it`
}

/** Why a knock tried without the meld help was refused. */
function knockRefusal(state: GinState, player: PlayerIndex, cardId: string): string {
  const limit = knockLimit(state)
  const left = deadwoodAfterThrow(state, player, cardId)
  return limit === 0 ? `Only gin ends the hand: ${left} left over` : `${left} left over: knock at ${limit} or less`
}

/** The note under the piles: the hand, and (when the rules change them) the knock limit and a doubled hand. */
function handNote(state: GinState): string {
  const parts = [`Hand ${state.hand}`]
  const limit = knockLimit(state)
  if (limit === 0) parts.push('Gin only')
  else if (limit !== KNOCK_LIMIT) parts.push(`Knock at ${limit}`)
  if (isDoubled(state)) parts.push('Spades double')
  return parts.join(' · ')
}

/** How long a match is, as the result says it. */
function targetLine(target: GinTarget): string {
  return target === 1 ? 'One hand' : `First to ${target}`
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
      <Text variant='bodyMedium' style={[styles.center, { color: fgMuted }]}>
        {targetLine(state.rules.target)}
      </Text>
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
  const bonuses = GIN_BONUSES[state.rules.bonus]
  // With Oklahoma, a spade upcard doubles the hand, bonus and all.
  const doubled = result.doubled ? ', doubled for the spade' : ''
  if (result.ending === 'bigGin') return { title: knocker === you ? 'You Went Big Gin!' : `${name(knocker)} Went Big Gin`, body: `${name(knocker)} melded all eleven cards. ${name(defender)} had ${defence.points}. ${scores(knocker, result.points)}, with ${bonuses.bigGin} for Big Gin${doubled}.` }
  if (result.ending === 'gin') return { title: knocker === you ? 'You Went Gin!' : `${name(knocker)} Went Gin`, body: `${name(knocker)} melded every card. ${name(defender)} had ${defence.points}. ${scores(knocker, result.points)}, with ${bonuses.gin} for gin${doubled}.` }
  if (result.ending === 'undercut') return { title: defender === you ? 'You Undercut!' : `${name(defender)} Undercut`, body: `${name(knocker)} knocked with ${knockerPoints}. ${name(defender)} had ${defence.points}${after}. ${scores(defender, result.points)}, with ${bonuses.undercut} for the undercut${doubled}.` }
  return { title: knocker === you ? 'You Knocked' : `${name(knocker)} Knocked`, body: `${name(knocker)} knocked with ${knockerPoints}. ${name(defender)} had ${defence.points}${after}. ${scores(knocker, result.points)}${doubled}.` }
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
  center: { textAlign: 'center' },
  scores: { alignItems: 'center', gap: 2 },
  screen: { flex: 1 }
})
