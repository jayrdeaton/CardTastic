// War's table: each player's deck near their own edge and the battle across the middle, each player's cards in a row on
// their side. Not GameChrome: the table lies flat between two players and never turns (layout.ts). A tap anywhere on
// your side turns your card over (or puts down your four in a war); against the CPU the whole table is yours. Every card
// off the decks is one view from the moment it leaves its deck until a won battle has carried it under its winner's
// (games/table/TableCards.tsx).

import { useKeepAwake } from '@rific/core'
import { type Card, CardSizeProvider } from '@tastic/cards'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { DeckStack } from '@/games/table/DeckStack'
import { otherPlayer, type PlayerIndex, TWO_PLAYER_HUMANS, VS_CPU_HUMANS } from '@/games/table/players'
import { QuitMatchDialog, useQuitMatch } from '@/games/table/QuitMatch'
import { type TableCardSpec } from '@/games/table/TableCards'
import { type Seat, type TableCardContent, TableOverlay, useAppActive, useFaceToFace, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, TableView } from '@/games/table/TableView'
import { TouchZones } from '@/games/table/TouchZones'
import { useNextRound } from '@/games/table/useNextRound'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { matchStatsActions } from '@/redux/matchStatsSlice'

import { canPlay, handOf } from './engine/rules'
import { SHORT_GAME_BATTLES, type WarState } from './engine/types'
import { battleCardPose, type WarLayout, warLayout } from './layout'
import { WAR_RULE_KEYS } from './ruleSettings'
import { type WarRoundSettings } from './useWarLoadout'
import { useWarMatch } from './useWarMatch'

/** A card turned over onto the battle, or put down in a war. */
const PLAY_MOVE_MS = 260
/** A won battle carried under its winner's deck. */
const COLLECT_MOVE_MS = 380
/** A battle's cards leave the table once they've reached their winner's deck: they lie hidden under it by then. */
const DEPARTURE_MS = COLLECT_MOVE_MS + 150
/** The result waits for the last battle to reach its winner. */
const RESULT_DELAY_MS = COLLECT_MOVE_MS + 300

/** A won battle on its way to its winner. */
type Departure = { key: number; player: PlayerIndex; cards: Card[] }

export function WarScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, hapticCard } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, the length); a direct link plays the player's own settings against the
  // CPU.
  const { mode, settings: round } = useActiveRound<WarRoundSettings>('war', { warLength: settings.warLength, warDown: settings.warDown })
  const twoPlayer = mode === 'twoPlayer'
  const humans = twoPlayer ? TWO_PLAYER_HUMANS : VS_CPU_HUMANS
  const { seats, statsIds } = useTableSeats(twoPlayer)
  // Player 2's side turned to face them: 2 Player on a phone or tablet only (useFaceToFace). At a computer it's drawn upright, as
  // against the CPU, while the halves still split the table top and bottom for each person's taps.
  const faceToFace = useFaceToFace(twoPlayer)
  const layout = useMemo(() => warLayout(width, height, insets, faceToFace), [width, height, insets, faceToFace])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const quit = useQuitMatch()
  // Settings or Quit Match? is up: the table holds.
  const dialogOpen = settingsOpen || quit.asking
  const appActive = useAppActive()
  const [departures, setDepartures] = useState<Departure[]>([])
  const seq = useRef(0)
  // Each seat's battles won this match, recorded with the result.
  const battlesWon = useRef({ 1: 0, 2: 0 })

  const changed = useCallback(
    (prev: WarState, next: WarState) => {
      playCardSound()
      if (next.battleWinner !== null && prev.battleWinner === null) battlesWon.current[next.battleWinner]++
      if (prev.battleWinner !== null && next.battleWinner === null && !reduceMotion) {
        const key = seq.current++
        const cards = [...prev.battle[0], ...prev.battle[1]].map(({ card }) => card)
        setDepartures((current) => [...current, { key, player: prev.battleWinner!, cards }])
        setTimeout(() => setDepartures((current) => current.filter((d) => d.key !== key)), DEPARTURE_MS)
      }
      if (next.winner !== null && prev.winner === null) {
        const seat = (player: PlayerIndex) => ({ player: statsIds[player], outcome: next.winner === 'tie' ? ('tied' as const) : next.winner === player ? ('won' as const) : ('lost' as const), counts: { battlesWon: battlesWon.current[player] } })
        // War's CPU has no levels; its matches are kept under the middle one.
        dispatch(matchStatsActions.recordMatch({ game: 'war', cpu: twoPlayer ? null : 'medium', seats: twoPlayer ? [seat(1), seat(2)] : [seat(1)] }))
      }
    },
    [playCardSound, reduceMotion, statsIds, dispatch, twoPlayer]
  )

  const { state, play, rematch: newMatch } = useWarMatch({ length: round.warLength, down: round.warDown, cpu: !twoPlayer, paused: dialogOpen || !appActive, changed })
  const [games, setGames] = useState(0)
  const resultShown = useSettled(state.winner !== null ? games : null, RESULT_DELAY_MS)

  const handleTouch = useCallback(
    (player: PlayerIndex, _x: number, y: number) => {
      // With two people each half is one player's.
      if (twoPlayer && (y >= layout.center.y ? 1 : 2) !== player) return
      if (play(player)) hapticCard()
    },
    [twoPlayer, layout, play, hapticCard]
  )

  const nextRound = useNextRound('war', mode, round, WAR_RULE_KEYS)
  const rematch = useCallback(() => {
    battlesWon.current = { 1: 0, 2: 0 }
    setDepartures([])
    setGames((n) => n + 1)
    const next = nextRound()
    newMatch({ length: next.warLength, down: next.warDown })
  }, [newMatch, nextRound])

  const label = (player: PlayerIndex): TableLabel => ({ seat: seats[player], subtitle: null, score: cardsLabel(handOf(state, player).length), active: canPlay(state, player) })
  const prompts: Partial<Record<PlayerIndex, string | null>> = {}
  const notes: Partial<Record<PlayerIndex, string | null>> = {}
  for (const player of humans) {
    prompts[player] = promptFor(state, player, seats)
    notes[player] = state.winner === null ? `Battle ${state.battles + 1}${state.length === 'short' ? ` of ${SHORT_GAME_BATTLES}` : ''}` : null
  }
  const cards = useMemo(() => warCards(state, layout, departures, reduceMotion), [state, layout, departures, reduceMotion])
  const glows = humans.filter((player) => canPlay(state, player)).map((player) => layout.decks[player])
  const winner = state.winner

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView
          game='war'
          layout={layout}
          cards={cards}
          dealKey={games}
          glows={glows}
          labels={{ 1: label(1), 2: label(2) }}
          prompts={prompts}
          notes={notes}
          call={null}
          emptySlots={[]}
          overCards={([1, 2] as const).map((player) => (
            <DeckStack key={player} at={layout.decks[player]} count={handOf(state, player).length} cardWidth={layout.cardWidth} cardHeight={layout.cardHeight} testID={`war-deck-${player}`} />
          ))}
          touch={<TouchZones testID='war' twoPlayer={twoPlayer} splitY={layout.center.y} height={layout.height} enabled={!dialogOpen && !resultShown && winner === null} onTouch={handleTouch} />}
          onSettings={() => setSettingsOpen(true)}
        >
          {resultShown && winner !== null ? <TableOverlay humans={humans} content={(viewer) => resultContent(state, viewer, seats)} actionLabel='Rematch' onAction={rematch} testID='war-result' /> : null}
          {resultShown && winner !== null && winner !== 'tie' && humans.includes(winner) ? <PipFireworks /> : null}
        </TableView>
      </View>
      <QuitMatchDialog quit={quit} state={state} over={state.winner !== null} />
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
    </CardSizeProvider>
  )
}

const cardsLabel = (count: number) => (count === 1 ? '1 card' : `${count} cards`)

/** Every card off the decks, bottom to top: battles on their way to their winners, then the battle in play, each card
 * first appearing over its owner's deck. A card the battle already draws is never drawn twice. */
function warCards(state: WarState, layout: WarLayout, departures: Departure[], reduceMotion: boolean): TableCardSpec[] {
  const move = reduceMotion ? 0 : PLAY_MOVE_MS
  const live = new Set([...state.battle[0], ...state.battle[1]].map(({ card }) => card.id))
  const specs: TableCardSpec[] = []
  for (const departure of departures) for (const card of departure.cards) if (!live.has(card.id)) specs.push({ card, pose: layout.decks[departure.player], faceUp: false, durationMs: COLLECT_MOVE_MS })
  for (const player of [1, 2] as const) {
    const row = state.battle[player - 1]
    row.forEach(({ card, faceUp }, i) => specs.push({ card, pose: battleCardPose(layout, player, i, row.length), faceUp, from: layout.decks[player], durationMs: move }))
  }
  return specs
}

/** What a person's prompt line says: what to do, whose battle it is, or who they're waiting for. */
function promptFor(state: WarState, player: PlayerIndex, seats: Record<PlayerIndex, Seat>): string | null {
  if (state.winner !== null) return null
  const other = seats[otherPlayer(player)].name
  if (state.battleWinner !== null) return state.battleWinner === player ? 'You win the battle' : `${seats[state.battleWinner].name} wins the battle`
  if (canPlay(state, player)) return state.war ? 'War! Put down four cards' : 'Turn over your card'
  return state.played[player - 1] ? `Waiting for ${other}` : null
}

/** The match's result, as each person reads it. */
function resultContent(state: WarState, viewer: PlayerIndex, seats: Record<PlayerIndex, Seat>): TableCardContent {
  const winner = state.winner
  const [one, two] = [state.hands[0].length, state.hands[1].length]
  const score = `${seats[1].name} ${one}, ${seats[2].name} ${two}.`
  if (winner === 'tie' || winner === null) return { icon: 'handshake-outline', title: 'A Tie', body: `Level after ${SHORT_GAME_BATTLES} battles.` }
  const everyCard = (winner === 1 ? two : one) === 0
  if (winner === viewer) return { icon: 'trophy', title: 'You Won!', body: everyCard ? 'Every card is yours.' : score }
  return { icon: 'cards-outline', title: `${seats[winner].name} Won`, body: everyCard ? `${seats[winner].name} took every card.` : score }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }
})
