// A card table's view (Six-Card Golf, Trash, War, Speed, Gin Rummy, Four Crowns): the cards (TableCards: every card one view as it moves
// between piles, a hand and a grid), a glow under each card the player whose move it is can tap (PileGlow), a tap target over it
// (or, where two people play at once, the game's own touch zones), each player's name row and prompt line facing them,
// the notes beside the middle row, and the Home and Settings buttons. What the cards are, which can be tapped and what
// the lines say is each game's own (its screen); this only draws them.

import { type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { EmptySlot } from '@/components/PlayingCard'
import { CHROME_FG, CHROME_FG_MUTED } from '@/components/theme'

import { cardRect, type Point, type Pose } from './geometry'
import { PileGlow, usePileGlowPulse } from './PileGlow'
import type { PlayerIndex } from './players'
import { TableCards, type TableCardSpec } from './TableCards'
import { type Seat, SeatBadge, TableSideButtons, tableStyles } from './TableChrome'

const SPOT_LABEL_SIZE = 30
/** A note's box, centered on its pose: room for Gin Rummy's "Hand 2 · Knock at 7 · Spades double". */
const NOTE_WIDTH = 260

/** Where a table's lines and buttons sit: each game's layout has these (gridLayout.ts, the War and Speed layouts). */
export interface TableFrame {
  cardWidth: number
  cardHeight: number
  /** The middle of the table: the Home and Settings buttons sit at the two ends of its row. */
  center: Point
  /** The middle of each player's name row, at their own edge. */
  labelY: Record<PlayerIndex, number>
  /** The middle of each player's prompt line, toward the middle. */
  promptY: Record<PlayerIndex, number>
  /** Where a note about the match sits for each person, turned to face them. */
  notes: Record<PlayerIndex, Pose>
  /** Whether player 2's side is turned to face them. */
  upsideDown: boolean
}

/** A card spot that can be tapped: a grid spot, the stock, the discard, a card in hand. */
export interface TableTarget {
  key: string
  at: Point
  label: string
  onPress: () => void
  /** False for a card with no glow under it: every card in a hand you pick from (Gin Rummy's). */
  glow?: boolean
}

/** A player's name row: who they are, a muted subtitle (the CPU's level), their score on the right, and whether it's
 * their move (a quiet player reads muted). */
export interface TableLabel {
  seat: Seat
  subtitle: string | null
  score: string | null
  active: boolean
}

/** A small label over a face-down card's middle: which rank a Trash spot wants. */
export interface TableSpotLabel {
  key: string
  at: Pose
  text: string
}

/** A short call over a player's prompt line. */
export interface TableCall {
  player: PlayerIndex
  text: string
  key: number
}

export function TableView({
  game,
  layout,
  cards,
  dealKey,
  targets = [],
  glows = [],
  labels,
  prompts,
  notes,
  call,
  spotLabels,
  emptySlots,
  overCards,
  touch,
  onSettings,
  children
}: {
  game: string
  layout: TableFrame
  cards: TableCardSpec[]
  /** Changes with every deal, so every card is drawn afresh and flies in from the stock. */
  dealKey: number
  /** Cards that can be tapped, each glowing, with a tap target over it. */
  targets?: TableTarget[]
  /** Cards glowing with no tap target of their own (a game whose touch zones take the taps). */
  glows?: Point[]
  /** Each seat's name row; a seat left out has no row, prompt or note (Four Crowns draws its other players' own). */
  labels: Partial<Record<PlayerIndex, TableLabel>>
  prompts: Partial<Record<PlayerIndex, string | null>>
  notes: Partial<Record<PlayerIndex, string | null>>
  call: TableCall | null
  spotLabels?: TableSpotLabel[]
  /** Piles with no card left, drawn as an empty slot. */
  emptySlots: Point[]
  /** Drawn over the moving cards: a deck a card slides out from under (DeckStack). */
  overCards?: ReactNode
  /** The game's own touch zones (TouchZones), under the Home and Settings buttons. */
  touch?: ReactNode
  onSettings: () => void
  /** Drawn over everything: a result card. */
  children?: ReactNode
}) {
  const pulse = usePileGlowPulse()
  const { cardWidth, cardHeight } = layout
  const slotStyle = (at: Point) => ({ left: at.x - cardWidth / 2, position: 'absolute' as const, top: at.y - cardHeight / 2 })
  return (
    <View style={StyleSheet.absoluteFill}>
      {emptySlots.map((at) => (
        <EmptySlot key={`${at.x}-${at.y}`} style={slotStyle(at)} />
      ))}
      {[...targets.filter((target) => target.glow !== false).map((target) => target.at), ...glows].map((at) => (
        <PileGlow key={`glow-${at.x}-${at.y}`} at={at} cardWidth={cardWidth} cardHeight={cardHeight} pulse={pulse} testID={`${game}-glow`} />
      ))}
      <TableCards key={dealKey} cards={cards} cardWidth={cardWidth} cardHeight={cardHeight} testID={`${game}-cards`} />
      {overCards}
      {spotLabels?.map(({ key, at, text }) => (
        <View key={key} pointerEvents='none' style={[styles.spotLabel, { left: at.x - SPOT_LABEL_SIZE / 2, top: at.y - SPOT_LABEL_SIZE / 2, transform: [{ rotate: `${at.rotate}deg` }] }]}>
          <Text variant='labelLarge' style={styles.spotLabelText}>
            {text}
          </Text>
        </View>
      ))}
      {([1, 2] as const).map((player) => {
        const label = labels[player]
        return label ? <PlayerLines key={player} game={game} player={player} layout={layout} label={label} prompt={prompts[player] ?? null} note={notes[player] ?? null} call={call?.player === player ? call : null} /> : null
      })}
      {targets.map((target) => {
        const rect = cardRect(target.at, cardWidth, cardHeight, 4)
        return <Pressable key={target.key} accessibilityRole='button' accessibilityLabel={target.label} onPress={target.onPress} style={[styles.target, { height: rect.height, left: rect.x, top: rect.y, width: rect.width }]} testID={`${game}-${target.key}`} />
      })}
      {touch}
      <TableSideButtons y={layout.center.y} onSettings={onSettings} />
      {children}
    </View>
  )
}

/** A player's name row, prompt line and note, each turned to face them. */
function PlayerLines({ game, player, layout, label, prompt, note, call }: { game: string; player: PlayerIndex; layout: TableFrame; label: TableLabel; prompt: string | null; note: string | null; call: TableCall | null }) {
  const flip = player === 2 && layout.upsideDown ? tableStyles.flipped : null
  const notePose: Pose = layout.notes[player]
  return (
    <>
      <View pointerEvents='none' style={[styles.line, { top: layout.labelY[player] - 14 }, flip]} testID={`${game}-label-${player}`}>
        <SeatBadge seat={label.seat} />
        <Text variant='labelLarge' style={[styles.name, { color: label.active ? CHROME_FG : CHROME_FG_MUTED }]} numberOfLines={1}>
          {label.seat.name}
          {label.subtitle ? <Text style={styles.muted}>{` · ${label.subtitle}`}</Text> : null}
        </Text>
        {label.score ? (
          <Text variant='labelLarge' style={styles.muted} testID={`${game}-score-${player}`}>
            {label.score}
          </Text>
        ) : null}
      </View>
      {call || prompt ? (
        <View pointerEvents='none' style={[styles.line, { top: layout.promptY[player] - 14 }, flip]} testID={`${game}-prompt-${player}`}>
          <Text variant={call ? 'titleMedium' : 'labelLarge'} style={[styles.prompt, call ? styles.call : null]} numberOfLines={1}>
            {call ? call.text : prompt}
          </Text>
        </View>
      ) : null}
      {note ? (
        <View pointerEvents='none' style={[styles.note, { left: notePose.x - NOTE_WIDTH / 2, top: notePose.y - 10, transform: [{ rotate: `${notePose.rotate}deg` }] }]}>
          <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
            {note}
          </Text>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  call: { color: CHROME_FG, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  line: { alignItems: 'center', flexDirection: 'row', gap: 8, height: 28, justifyContent: 'center', left: 0, paddingHorizontal: 24, position: 'absolute', right: 0 },
  muted: { color: CHROME_FG_MUTED },
  name: { flexShrink: 1 },
  note: { alignItems: 'center', height: 20, position: 'absolute', width: NOTE_WIDTH },
  prompt: { color: CHROME_FG, flexShrink: 1, opacity: 0.85 },
  spotLabel: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: SPOT_LABEL_SIZE / 2, height: SPOT_LABEL_SIZE, justifyContent: 'center', position: 'absolute', width: SPOT_LABEL_SIZE },
  spotLabelText: { color: '#fff' },
  target: { backgroundColor: 'transparent', position: 'absolute' }
})
