// Trash's table: each player's spots in two rows near their own edge (Ace to 5 over 6 to 10, each face-down spot marked
// with the rank it wants), the stock and the discard across the middle, and the card in hand between them on its
// player's turn. Not GameChrome: the table lies flat between two players and never turns (games/table/gridLayout.ts).
// Every card is one view the whole time it's on the table (games/table/TableCards.tsx), so a card visibly goes from the
// stock to a hand to its spot, and the card it covers comes up into the hand.

import { useKeepAwake } from '@rific/core'
import { type Card, CardSizeProvider, rankLabel } from '@tastic/cards'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
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
import { QuitMatchDialog, useQuitMatch } from '@/games/table/QuitMatch'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useFaceToFace, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableSpotLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useNextRound } from '@/games/table/useNextRound'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { canTakeDiscard, heldSpots, isWild, layoutOf, spotsLeft, toMove, wildName } from './engine/rules'
import { SPOTS_PER_ROW, type TrashState } from './engine/types'
import { TRASH_RULE_KEYS } from './ruleSettings'
import { type TrashRoundSettings } from './useTrashLoadout'
import { useTrashMatch } from './useTrashMatch'

/** A card's move between two places. */
const MOVE_MS = 300
/** The deal: a card every this often, both players' alternately, then the discard's first card. */
const DEAL_STAGGER_MS = 55
/** A round's last card is seen landing before its result shows. */
const RESULT_MS = 1000
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3

export function TrashScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, hapticCard } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the starting spots); a direct link plays the player's own settings
  // against the CPU.
  const { mode, settings: round } = useActiveRound<TrashRoundSettings>('trash', { trashCards: settings.trashCards, trashWild: settings.trashWild, trashCpu: settings.trashCpu })
  const twoPlayer = mode === 'twoPlayer'
  const cpu = twoPlayer ? null : round.trashCpu
  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { seats, statsIds } = useTableSeats(twoPlayer)
  // Player 2's side turned to face them: 2 Player on a phone or tablet only (useFaceToFace). At a computer it's drawn upright, as
  // against the CPU, while the halves still split the table top and bottom for each person's taps.
  const faceToFace = useFaceToFace(twoPlayer)
  const rows = Math.ceil(round.trashCards / SPOTS_PER_ROW)
  const layout = useMemo(() => gridTableLayout(width, height, insets, { columns: SPOTS_PER_ROW, rows, upsideDown: faceToFace }), [width, height, insets, rows, faceToFace])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const quit = useQuitMatch()
  // Settings or Quit Match? is up: the table holds.
  const dialogOpen = settingsOpen || quit.asking
  const appActive = useAppActive()
  const startSpots = round.trashCards

  const changed = useCallback(
    (prev: TrashState, next: TrashState) => {
      if (next !== prev) playCardSound()
      if (next.phase === 'matchOver' && prev.phase !== 'matchOver') {
        // A round won shortens the winner's spots by one; the match's last win doesn't (it ends the match).
        const roundsWon = (player: PlayerIndex) => startSpots - next.sizes[player - 1] + (next.winner === player ? 1 : 0)
        const seat = (player: PlayerIndex) => ({ player: statsIds[player], outcome: next.winner === player ? ('won' as const) : ('lost' as const), counts: { rounds: roundsWon(player) } })
        dispatch(matchStatsActions.recordMatch({ game: 'trash', cpu, seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
      }
    },
    [playCardSound, statsIds, dispatch, cpu, twoPlayer, startSpots]
  )

  const dealMs = reduceMotion ? 0 : (startSpots * 2 + 1) * DEAL_STAGGER_MS + MOVE_MS + 100
  const roundDone = (s: TrashState) => s.phase === 'roundOver' || s.phase === 'matchOver'
  const nextRound = useNextRound('trash', mode, round, TRASH_RULE_KEYS)
  const match = useTrashMatch({ spots: startSpots, wild: round.trashWild, cpu, paused: dialogOpen || !appActive, dealMs, changed })
  const { state, dealt } = match
  const resultShown = useSettled(roundDone(state) ? `${match.deal}-${state.round}` : null, reduceMotion ? 300 : RESULT_MS)
  const ready = dealt && !dialogOpen && !resultShown

  const act = useCallback(
    (done: boolean) => {
      if (done) hapticCard()
    },
    [hapticCard]
  )

  const targets: TableTarget[] = []
  if (ready) {
    for (const player of humans) {
      if (toMove(state) !== player) continue
      if (state.phase === 'draw') {
        targets.push({ key: 'stock', at: layout.stock, label: 'Draw from the stock', onPress: () => act(match.draw(player)) })
        if (canTakeDiscard(state, player)) targets.push({ key: 'discard', at: layout.discard, label: 'Take the discard', onPress: () => act(match.take(player)) })
      } else if (state.phase === 'place') {
        for (const spot of heldSpots(state)) targets.push({ key: `slot-${player}-${spot}`, at: layout.slots[player][spot], label: `Put it in spot ${spotName(spot)}`, onPress: () => act(match.place(player, spot)) })
      }
    }
  }

  const label = (player: PlayerIndex): TableLabel => {
    const spots = layoutOf(state, player)
    return { seat: seats[player], subtitle: player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null, score: `${spotsLeft(spots)} of ${spots.length} left`, active: toMove(state) === player }
  }
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  const notes: Partial<Record<PlayerIndex, string | null>> = {}
  for (const player of humans) {
    prompts[player] = dealt ? promptFor(state, player, seats) : null
    notes[player] = `Round ${state.round}`
  }
  const spotLabels: TableSpotLabel[] = dealt ? spotLabelsFor(state, layout) : []

  const cards = useMemo(() => trashCards(state, layout, !dealt, reduceMotion), [state, layout, dealt, reduceMotion])

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView game='trash' layout={layout} cards={cards} dealKey={match.deal} targets={targets} labels={{ 1: label(1), 2: label(2) }} prompts={prompts} notes={notes} call={null} spotLabels={spotLabels} emptySlots={[...(state.stock.length === 0 ? [layout.stock] : []), ...(state.discard.length === 0 ? [layout.discard] : [])]} onSettings={() => setSettingsOpen(true)}>
          {resultShown && state.phase === 'roundOver' ? <TableOverlay humans={humans} content={(viewer) => roundContent(state, viewer, seats)} actionLabel='Next Round' onAction={match.nextRound} testID='trash-round' /> : null}
          {resultShown && state.phase === 'matchOver' ? (
            <TableOverlay
              humans={humans}
              content={(viewer) => matchContent(state, viewer, seats)}
              actionLabel='Rematch'
              onAction={() => {
                const next = nextRound()
                match.rematch({ spots: next.trashCards, wild: next.trashWild })
              }}
              testID='trash-result'
            />
          ) : null}
          {resultShown && state.phase === 'matchOver' && state.winner !== null && humans.includes(state.winner) ? <PipFireworks /> : null}
        </TableView>
      </View>
      <QuitMatchDialog quit={quit} state={state} over={state.phase === 'matchOver'} />
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
    </CardSizeProvider>
  )
}

/** A spot's name: Ace, then its number. */
function spotName(spot: number): string {
  return spot === 0 ? 'Ace' : String(spot + 1)
}

/** The rank a card names in a prompt. */
function cardName(card: Card): string {
  return card.rank === 1 ? 'Ace' : rankLabel(card.rank)
}

/** Every card on the table, bottom to top: both layouts, the stock's top cards, the discard's, and the card in hand. A
 * deal sends each spot's card out from the stock in turn. */
function trashCards(state: TrashState, layout: GridTableLayout, dealing: boolean, reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : MOVE_MS
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const dealt = (order: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: order * DEAL_STAGGER_MS } : {})
  const specs: TableCardSpec[] = []
  for (const player of [1, 2] as const) layoutOf(state, player).forEach((card, i) => specs.push({ card, pose: layout.slots[player][i], faceUp: card.faceUp, durationMs: move, ...dealt(i * 2 + player - 1) }))
  const stock = state.stock.slice(-PILE_DRAWN)
  stock.forEach((card, k) => {
    const depth = stock.length - 1 - k
    specs.push({ card, pose: { x: layout.stock.x + depth * 2.5, y: layout.stock.y + depth * 2.5, rotate: 0 }, faceUp: false, durationMs: move })
  })
  const dealtCount = state.layouts[0].length + state.layouts[1].length
  state.discard.slice(-PILE_DRAWN).forEach((card) => specs.push({ card, pose: { ...layout.discard, rotate: cardTilt(card.id, 3) }, faceUp: true, durationMs: move, ...dealt(dealtCount) }))
  if (state.held) specs.push({ card: state.held, pose: layout.held[state.turn], faceUp: true, durationMs: move })
  return specs
}

/** Each face-down spot says which rank it wants, turned to face its player. */
function spotLabelsFor(state: TrashState, layout: GridTableLayout): TableSpotLabel[] {
  const labels: TableSpotLabel[] = []
  for (const player of [1, 2] as const)
    layoutOf(state, player).forEach((card, i) => {
      if (!card.faceUp) labels.push({ key: `${player}-${i}`, at: layout.slots[player][i], text: i === 0 ? 'A' : String(i + 1) })
    })
  return labels
}

/** What a person's prompt line says: what to do now, or whose turn it is. */
function promptFor(state: TrashState, player: PlayerIndex, seats: Record<PlayerIndex, Seat>): string | null {
  if (state.phase !== 'draw' && state.phase !== 'place') return null
  if (state.turn !== player) return `${seats[otherPlayer(player)].name}’s turn`
  if (state.phase === 'draw') return canTakeDiscard(state, player) ? 'Draw a card, or take the discard' : 'Draw a card'
  if (!state.held) return null
  if (heldSpots(state).length === 0) return 'No spot for it'
  return isWild(state.held, state.wild) ? `Put the ${wildName(state.wild)} in any face-down spot` : `Put the ${cardName(state.held)} in its spot`
}

const spots = (n: number) => (n === 1 ? '1 spot' : `${n} spots`)

/** A round's result, as each person reads it: who won it, and how many spots each has next. */
function roundContent(state: TrashState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = state.roundWinner!
  const next = (player: PlayerIndex) => state.sizes[player - 1] - (player === winner ? 1 : 0)
  const other = otherPlayer(viewer)
  const body = `Next round you have ${spots(next(viewer))}, ${seats[other].name} has ${spots(next(other))}.`
  return winner === viewer ? { icon: 'cards', title: 'You Won the Round', body } : { icon: 'cards-outline', title: `${seats[winner].name} Won the Round`, body }
}

/** The match's result, as each person reads it. */
function matchContent(state: TrashState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = state.winner!
  return winner === viewer ? { icon: 'trophy', title: 'You Won!', body: 'You filled your last spot.' } : { icon: 'cards-outline', title: `${seats[winner].name} Won`, body: `${seats[winner].name} filled their last spot.` }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }
})
