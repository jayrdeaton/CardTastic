// Six-Card Golf's table: each player's six cards in two rows near their own edge, the stock and the discard across the
// middle, and the card in hand between them on its player's turn. Not GameChrome: the table lies flat between two
// players and never turns (games/table/gridLayout.ts). Every card is one view the whole time it's on the table
// (games/table/TableCards.tsx), so a card visibly goes from the stock to a hand to a grid to the discard.

import { useKeepAwake } from '@rific/core'
import { CardSizeProvider } from '@tastic/cards'
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
import { type GridTableLayout, gridTableLayout } from '@/games/table/gridLayout'
import { otherPlayer, type PlayerIndex, TWO_PLAYER_HUMANS, VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { gridOf, matchWinner, showingScore, toMove, totals } from './engine/rules'
import { type GolfState, GRID_COLUMNS, GRID_SIZE } from './engine/types'
import { useGolfMatch } from './useGolfMatch'
import { type SixCardGolfRoundSettings } from './useSixCardGolfLoadout'

/** A card's move between two places. */
const MOVE_MS = 320
/** The deal: a card every this often, both players' alternately, then the discard's first card. */
const DEAL_STAGGER_MS = 70
const DEAL_MS = (GRID_SIZE * 2 + 1) * DEAL_STAGGER_MS + MOVE_MS + 100
/** A hole's cards stay turned over this long before its scores show. */
const REVEAL_MS = 1400
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3

export function SixCardGolfScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, hapticCard } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the holes); a direct link plays the player's own settings against the
  // CPU.
  const { mode, settings: round } = useActiveRound<SixCardGolfRoundSettings>('sixcardgolf', { sixCardGolfHoles: settings.sixCardGolfHoles, sixCardGolfCpu: settings.sixCardGolfCpu })
  const twoPlayer = mode === 'twoPlayer'
  const cpu = twoPlayer ? null : round.sixCardGolfCpu
  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { seats, statsIds } = useTableSeats(twoPlayer)
  const layout = useMemo(() => gridTableLayout(width, height, insets, { columns: GRID_COLUMNS, rows: 2, upsideDown: twoPlayer }), [width, height, insets, twoPlayer])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const appActive = useAppActive()

  const changed = useCallback(
    (prev: GolfState, next: GolfState) => {
      if (next !== prev) playCardSound()
      if (next.phase === 'matchOver' && prev.phase !== 'matchOver') {
        const winner = matchWinner(next)
        const seat = (player: PlayerIndex) => ({
          player: statsIds[player],
          outcome: winner === null ? ('tied' as const) : winner === player ? ('won' as const) : ('lost' as const),
          counts: { holes: next.holes },
          lows: { bestHole: Math.min(...next.scores[player - 1]) }
        })
        dispatch(matchStatsActions.recordMatch({ game: 'sixcardgolf', cpu, seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
      }
    },
    [playCardSound, statsIds, dispatch, cpu, twoPlayer]
  )

  // The CPU holds while a dialog is open or the app is away, and while cards are being dealt (useGolfMatch). A hole's
  // scores show once its cards have been turned over long enough to read.
  const match = useGolfMatch({ holes: round.sixCardGolfHoles, cpu, paused: settingsOpen || !appActive, dealMs: reduceMotion ? 0 : DEAL_MS, changed })
  const { state, dealt } = match
  const holeDone = state.phase === 'holeOver' || state.phase === 'matchOver'
  const scoresShown = useSettled(holeDone ? `${match.deal}-${state.hole}` : null, reduceMotion ? 300 : REVEAL_MS)
  const ready = dealt && !settingsOpen && !scoresShown

  const act = useCallback(
    (done: boolean) => {
      if (done) hapticCard()
    },
    [hapticCard]
  )

  const targets: TableTarget[] = []
  if (ready) {
    for (const player of humans) {
      const grid = gridOf(state, player)
      if (state.phase === 'flip' && state.toFlip[player - 1] > 0) {
        grid.forEach((card, i) => {
          if (!card.faceUp) targets.push({ key: `slot-${player}-${i}`, at: layout.slots[player][i], label: `Turn up card ${i + 1}`, onPress: () => act(match.flip(player, i)) })
        })
      } else if (toMove(state) === player && state.phase === 'draw') {
        targets.push({ key: 'stock', at: layout.stock, label: 'Draw from the stock', onPress: () => act(match.draw(player)) })
        if (state.discard.length > 0) targets.push({ key: 'discard', at: layout.discard, label: 'Take the discard', onPress: () => act(match.take(player)) })
      } else if (toMove(state) === player && state.phase === 'place') {
        grid.forEach((_, i) => targets.push({ key: `slot-${player}-${i}`, at: layout.slots[player][i], label: `Swap into card ${i + 1}`, onPress: () => act(match.swap(player, i)) }))
        if (state.held?.from === 'stock') targets.push({ key: 'discard', at: layout.discard, label: 'Discard it', onPress: () => act(match.discard(player)) })
      }
    }
  }

  const [one, two] = totals(state)
  const label = (player: PlayerIndex): TableLabel => ({
    seat: seats[player],
    subtitle: player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null,
    // What the hole shows so far, then (in a match of several holes, once one is done) the match's total.
    score: `This hole ${showingScore(gridOf(state, player))}${state.holes > 1 && state.scores[0].length > 0 ? ` · Total ${player === 1 ? one : two}` : ''}`,
    active: state.phase === 'flip' ? state.toFlip[player - 1] > 0 : toMove(state) === player
  })
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  const notes: Partial<Record<PlayerIndex, string | null>> = {}
  for (const player of humans) {
    prompts[player] = dealt ? promptFor(state, player, seats) : null
    notes[player] = state.holes > 1 ? `Hole ${state.hole} of ${state.holes}` : null
  }

  const cards = useMemo(() => golfCards(state, layout, !dealt, reduceMotion), [state, layout, dealt, reduceMotion])
  const winner = matchWinner(state)

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView game='sixcardgolf' layout={layout} cards={cards} dealKey={match.deal} targets={targets} labels={{ 1: label(1), 2: label(2) }} prompts={prompts} notes={notes} call={null} emptySlots={[...(state.stock.length === 0 ? [layout.stock] : []), ...(state.discard.length === 0 ? [layout.discard] : [])]} onSettings={() => setSettingsOpen(true)}>
          {scoresShown && state.phase === 'holeOver' ? <TableOverlay humans={humans} content={(viewer) => holeContent(state, viewer, seats)} actionLabel='Next Hole' onAction={match.nextHole} testID='sixcardgolf-hole' /> : null}
          {scoresShown && state.phase === 'matchOver' ? <TableOverlay humans={humans} content={(viewer) => matchContent(state, viewer, seats)} actionLabel='Rematch' onAction={match.rematch} testID='sixcardgolf-result' /> : null}
          {scoresShown && state.phase === 'matchOver' && winner !== null && humans.includes(winner) ? <PipFireworks /> : null}
        </TableView>
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} rotation={0} />
    </CardSizeProvider>
  )
}

/** Every card on the table, bottom to top: both grids, the stock's top cards, the discard's, and the card in hand. A
 * deal sends each grid card out from the stock in turn. */
function golfCards(state: GolfState, layout: GridTableLayout, dealing: boolean, reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : MOVE_MS
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const dealt = (order: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: order * DEAL_STAGGER_MS } : {})
  const specs: TableCardSpec[] = []
  for (const player of [1, 2] as const) gridOf(state, player).forEach((card, i) => specs.push({ card, pose: layout.slots[player][i], faceUp: card.faceUp, durationMs: move, ...dealt(i * 2 + player - 1) }))
  const stock = state.stock.slice(-PILE_DRAWN)
  stock.forEach((card, k) => {
    const depth = stock.length - 1 - k
    specs.push({ card, pose: { x: layout.stock.x + depth * 2.5, y: layout.stock.y + depth * 2.5, rotate: 0 }, faceUp: false, durationMs: move })
  })
  state.discard.slice(-PILE_DRAWN).forEach((card) => specs.push({ card, pose: { ...layout.discard, rotate: cardTilt(card.id, 3) }, faceUp: true, durationMs: move, ...dealt(GRID_SIZE * 2) }))
  if (state.held) specs.push({ card: state.held.card, pose: layout.held[state.turn], faceUp: true, durationMs: move })
  return specs
}

/** What a person's prompt line says: what to do now, or whose turn it is. */
function promptFor(state: GolfState, player: PlayerIndex, seats: Record<PlayerIndex, Seat>): string | null {
  const other = seats[otherPlayer(player)].name
  if (state.phase === 'flip') {
    const left = state.toFlip[player - 1]
    return left === 2 ? 'Turn two of your cards face up' : left === 1 ? 'Turn one more card face up' : `Waiting for ${other}`
  }
  if (state.phase !== 'draw' && state.phase !== 'place') return null
  const last = state.finisher !== null && state.finisher !== state.turn
  if (state.turn !== player) return last ? `${other}’s last turn` : `${other}’s turn`
  if (state.phase === 'draw') return last ? 'Last turn: draw, or take the discard' : 'Draw a card, or take the discard'
  return state.held?.from === 'stock' ? 'Swap it for one of yours, or discard it' : 'Swap it for one of your cards'
}

/** A hole's scores, as each person reads them: who leads, and the scores so far. */
function holeContent(state: GolfState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const [one, two] = totals(state)
  const mine = viewer === 1 ? one : two
  const theirs = viewer === 1 ? two : one
  const other = seats[otherPlayer(viewer)].name
  const body = mine === theirs ? 'All square.' : mine < theirs ? `You lead by ${theirs - mine}.` : `${other} leads by ${mine - theirs}.`
  return { icon: 'golf', title: `Hole ${state.hole} of ${state.holes}`, body, details: <GolfScores state={state} seats={seats} /> }
}

/** The match's result, as each person reads it. */
function matchContent(state: GolfState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = matchWinner(state)
  const details = <GolfScores state={state} seats={seats} />
  if (winner === null) return { icon: 'handshake-outline', title: 'A Tie', body: 'Level after every hole.', details }
  if (winner === viewer) return { icon: 'trophy', title: 'You Won!', body: 'The lowest score wins.', details }
  return { icon: 'cards-outline', title: `${seats[winner].name} Won`, body: 'The lowest score wins.', details }
}

/** Both players' last hole and their totals. */
function GolfScores({ state, seats }: { state: GolfState; seats: Record<PlayerIndex, Seat> }) {
  const { fg, fgMuted: muted } = useOverlayCardColors()
  const [one, two] = totals(state)
  const rows = [
    { player: 1 as const, hole: state.scores[0][state.scores[0].length - 1], total: one },
    { player: 2 as const, hole: state.scores[1][state.scores[1].length - 1], total: two }
  ]
  return (
    <View style={styles.scores}>
      <View style={styles.scoreRow}>
        <View style={styles.scoreName} />
        <Text variant='labelMedium' style={[styles.scoreCell, { color: muted }]}>
          {state.holes > 1 ? 'HOLE' : 'SCORE'}
        </Text>
        {state.holes > 1 ? (
          <Text variant='labelMedium' style={[styles.scoreCell, { color: muted }]}>
            TOTAL
          </Text>
        ) : null}
      </View>
      {rows.map(({ player, hole, total }) => (
        <View key={player} style={styles.scoreRow}>
          <Text variant='bodyLarge' style={[styles.scoreName, { color: fg }]} numberOfLines={1}>
            {seats[player].name}
          </Text>
          <Text variant='bodyLarge' style={[styles.scoreCell, { color: fg }]}>
            {hole}
          </Text>
          {state.holes > 1 ? (
            <Text variant='bodyLarge' style={[styles.scoreCell, { color: fg }]}>
              {total}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  scoreCell: { textAlign: 'right', width: 56 },
  scoreName: { flex: 1 },
  scoreRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scores: { alignSelf: 'stretch', gap: 4, marginTop: 4 },
  screen: { flex: 1 }
})
