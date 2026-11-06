// Speed's table: each player's hand of five near their own edge with their draw pile just inside it, and the two side
// piles either side of the two center piles across the middle. Not GameChrome: the table lies flat between two players
// and never turns (layout.ts). There are no turns: tap a card in your hand to play it onto the center pile it fits (and,
// drawing by hand, your draw pile to fill an empty spot, ringed while that's what you need), and two people can play
// at the same moment (games/table/TouchZones.tsx gives each half its own touches). Every card is one
// view from the deal until the match ends (games/table/TableCards.tsx): a card goes from a draw pile to a hand to a
// center pile, and from a side pile to a center pile, as the same view.

import { useKeepAwake } from '@rific/core'
import { CardSizeProvider } from '@tastic/cards'
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
import { cardRect, cardTilt, inRect, type Pose } from '@/games/table/geometry'
import { type PlayerIndex, TWO_PLAYER_HUMANS, VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, TableView } from '@/games/table/TableView'
import { TouchZones } from '@/games/table/TouchZones'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { canDraw, cardsLeft, handOf, hasMove, isStuck } from './engine/rules'
import { HAND_SIZE, type SpeedState } from './engine/types'
import { type SpeedLayout, speedLayout } from './layout'
import { type SpeedRoundSettings } from './useSpeedLoadout'
import { useSpeedMatch } from './useSpeedMatch'

/** A card's move between two places. Quick: it's a race. */
const MOVE_MS = 200
/** The deal: a card every this often, out from the middle. */
const DEAL_STAGGER_MS = 30
/** Cards dealt: both hands, both draw piles' top cards, both side piles' and both starters. */
const DEAL_MS = 32 * DEAL_STAGGER_MS + MOVE_MS + 150
/** The result waits for the last card to land. */
const RESULT_DELAY_MS = MOVE_MS + 500
/** How many of a pile's top cards are drawn. */
const PILE_DRAWN = 3

export function SpeedScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, playInvalidSound, hapticCard, hapticInvalid } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the rules); a direct link plays the player's own settings.
  const { mode, settings: round } = useActiveRound<SpeedRoundSettings>('speed', { speedWrap: settings.speedWrap, speedRefill: settings.speedRefill, speedCpu: settings.speedCpu })
  const rules = useMemo(() => ({ wrap: round.speedWrap, refill: round.speedRefill }), [round.speedWrap, round.speedRefill])
  const twoPlayer = mode === 'twoPlayer'
  const cpu = twoPlayer ? null : round.speedCpu
  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { seats, statsIds } = useTableSeats(twoPlayer)
  const layout = useMemo(() => speedLayout(width, height, insets, twoPlayer), [width, height, insets, twoPlayer])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const appActive = useAppActive()

  const changed = useCallback(
    (prev: SpeedState, next: SpeedState) => {
      playCardSound()
      if (next.winner !== null && prev.winner === null) {
        const seat = (player: PlayerIndex) => ({ player: statsIds[player], outcome: next.winner === 'tie' ? ('tied' as const) : next.winner === player ? ('won' as const) : ('lost' as const), counts: { cardsPlayed: 20 - cardsLeft(next, player) } })
        dispatch(matchStatsActions.recordMatch({ game: 'speed', cpu, seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
      }
    },
    [playCardSound, statsIds, dispatch, cpu, twoPlayer]
  )

  const match = useSpeedMatch({ rules, cpu, paused: settingsOpen || !appActive, dealMs: reduceMotion ? 0 : DEAL_MS, changed })
  const { state, dealt, play, draw, rematch } = match
  const resultShown = useSettled(state.winner !== null ? match.deal : null, RESULT_DELAY_MS)

  // A tap on a card in your hand plays it; on a card that fits nowhere, or anywhere else, nothing (a card that doesn't
  // fit buzzes). Drawing by hand, a tap on your draw pile fills an empty spot.
  const handleTouch = useCallback(
    (player: PlayerIndex, x: number, y: number) => {
      if (rules.refill === 'tap' && inRect({ x, y }, cardRect(layout.draws[player], layout.cardWidth, layout.cardHeight, 4))) {
        if (draw(player)) hapticCard()
        else {
          playInvalidSound()
          hapticInvalid()
        }
        return
      }
      const slot = layout.hands[player].findIndex((pose) => inRect({ x, y }, cardRect(pose, layout.cardWidth, layout.cardHeight, 4)))
      if (slot < 0) return
      if (play(player, slot)) hapticCard()
      else {
        playInvalidSound()
        hapticInvalid()
      }
    },
    [layout, rules.refill, play, draw, hapticCard, playInvalidSound, hapticInvalid]
  )

  const label = (player: PlayerIndex): TableLabel => ({ seat: seats[player], subtitle: player === 2 && cpu ? CPU_LEVEL_LABELS[cpu] : null, score: `${cardsLeft(state, player)} to go`, active: state.winner === null && hasMove(state, player) })
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  for (const player of humans) prompts[player] = dealt ? promptFor(state, player) : null
  const cards = useMemo(() => speedCards(state, layout, !dealt, reduceMotion), [state, layout, dealt, reduceMotion])
  const winner = state.winner
  // Drawing by hand, a person's draw pile is ringed while they have nothing to play and a spot to fill.
  const rings = dealt ? humans.filter((player) => canDraw(state, player) && !hasMove(state, player)).map((player) => layout.draws[player]) : []
  const emptySlots = [...([0, 1] as const).filter((pile) => state.sides[pile].length === 0).map((pile) => layout.sides[pile]), ...([1, 2] as const).filter((player) => state.draws[player - 1].length === 0).map((player) => layout.draws[player])]

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView game='speed' layout={layout} cards={cards} dealKey={match.deal} rings={rings} labels={{ 1: label(1), 2: label(2) }} prompts={prompts} notes={{}} call={null} emptySlots={emptySlots} touch={<TouchZones testID='speed' twoPlayer={twoPlayer} splitY={layout.center.y} height={layout.height} enabled={dealt && !settingsOpen && !resultShown && winner === null} onTouch={handleTouch} />} onSettings={() => setSettingsOpen(true)}>
          {resultShown && winner !== null ? <TableOverlay humans={humans} content={(viewer) => resultContent(state, viewer, seats)} actionLabel='Rematch' onAction={rematch} testID='speed-result' /> : null}
          {resultShown && winner !== null && winner !== 'tie' && humans.includes(winner) ? <PipFireworks /> : null}
        </TableView>
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} rotation={0} />
    </CardSizeProvider>
  )
}

/** Every card on the table, bottom to top: the side piles' and draw piles' top cards, the center piles', then both
 * hands. A deal sends every card out from the middle in turn. */
function speedCards(state: SpeedState, layout: SpeedLayout, dealing: boolean, reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : MOVE_MS
  const from: Pose = { ...layout.center, rotate: 0 }
  let order = 0
  const dealt = () => (dealing && !reduceMotion ? { from, delayMs: order++ * DEAL_STAGGER_MS } : {})
  const specs: TableCardSpec[] = []
  const pile = (cards: SpeedState['draws'][number], at: Pose) => {
    const shown = cards.slice(-PILE_DRAWN)
    shown.forEach((card, k) => {
      const depth = shown.length - 1 - k
      specs.push({ card, pose: { x: at.x + depth * 2.5, y: at.y + depth * 2.5, rotate: at.rotate }, faceUp: false, durationMs: move, ...dealt() })
    })
  }
  for (const player of [1, 2] as const) {
    handOf(state, player).forEach((card, slot) => {
      if (card) specs.push({ card, pose: layout.hands[player][slot], faceUp: true, durationMs: move, ...dealt() })
    })
  }
  ;[0, 1].forEach((side) => pile(state.sides[side], layout.sides[side]))
  for (const player of [1, 2] as const) pile(state.draws[player - 1], layout.draws[player])
  ;[0, 1].forEach((c) => state.centers[c].slice(-PILE_DRAWN).forEach((card) => specs.push({ card, pose: { ...layout.centers[c], rotate: cardTilt(card.id, 3) }, faceUp: true, durationMs: move, ...dealt() })))
  return specs
}

/** What a person's prompt line says: nothing while they have a card to play; why they're waiting when they don't. */
function promptFor(state: SpeedState, player: PlayerIndex): string | null {
  if (state.winner !== null) return null
  if (isStuck(state)) return 'Nobody can play: new cards coming'
  if (!hasMove(state, player)) return canDraw(state, player) ? 'Draw from your pile' : 'Nothing fits yet'
  // At the very start, what to do.
  const untouched = state.centers[0].length === 1 && state.centers[1].length === 1 && handOf(state, 1).length === HAND_SIZE && cardsLeft(state, 1) + cardsLeft(state, 2) === 40
  return untouched ? 'Play a card one up or one down' : null
}

/** The match's result, as each person reads it. */
function resultContent(state: SpeedState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = state.winner
  if (winner === 'tie' || winner === null) return { icon: 'handshake-outline', title: 'A Tie', body: 'Nobody could play, with as many cards left each.' }
  const playedOut = cardsLeft(state, winner) === 0
  const name = winner === viewer ? 'You' : seats[winner].name
  const body = playedOut ? `${name} played every card.` : `Nobody could play. ${name} had fewer cards left.`
  return winner === viewer ? { icon: 'trophy', title: 'You Won!', body } : { icon: 'cards-outline', title: `${seats[winner].name} Won`, body }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }
})
