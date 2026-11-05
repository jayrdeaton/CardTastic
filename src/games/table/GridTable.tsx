// A grid table's view (Six-Card Golf, Trash): the cards (TableCards: every card one view as it moves between the stock,
// a hand and a grid), a ring round each card the player whose move it is can tap, a tap target over it, each player's
// name row and prompt line facing them, the notes beside the middle row, and the Home and Settings buttons. What the
// cards are, which can be tapped and what the lines say is each game's own (its screen); this only draws them.

import { type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { EmptySlot } from '@/components/PlayingCard'
import { CHROME_FG, CHROME_FG_MUTED, useTableColors } from '@/components/theme'

import { type Point, type Pose } from './geometry'
import { type GridTableLayout, targetRect } from './gridLayout'
import type { PlayerIndex } from './players'
import { TableCards, type TableCardSpec } from './TableCards'
import { type Seat, SeatBadge, TableSideButtons, tableStyles } from './TableChrome'

/** The ring round a card that can be tapped sits this far outside it (a card has a white frame of its own). */
const RING_GAP = 5
const SPOT_LABEL_SIZE = 30

/** A card spot that can be tapped: a grid spot, the stock, the discard. */
export interface GridTarget {
  key: string
  at: Point
  label: string
  onPress: () => void
}

/** A player's name row: who they are, a muted subtitle (the CPU's level), their score on the right, and whether it's
 * their move (a quiet player reads muted). */
export interface GridLabel {
  seat: Seat
  subtitle: string | null
  score: string | null
  active: boolean
}

/** A small label over a face-down card's middle: which rank a Trash spot wants. */
export interface GridSpotLabel {
  key: string
  at: Pose
  text: string
}

/** A short call over a player's prompt line. */
export interface GridCall {
  player: PlayerIndex
  text: string
  key: number
}

export function GridTable({
  game,
  layout,
  cards,
  dealKey,
  targets,
  labels,
  prompts,
  notes,
  call,
  spotLabels,
  emptyStock,
  emptyDiscard,
  onSettings,
  children
}: {
  game: string
  layout: GridTableLayout
  cards: TableCardSpec[]
  /** Changes with every deal, so every card is drawn afresh and flies in from the stock. */
  dealKey: number
  targets: GridTarget[]
  labels: Record<PlayerIndex, GridLabel>
  prompts: Partial<Record<PlayerIndex, string | null>>
  notes: Partial<Record<PlayerIndex, string | null>>
  call: GridCall | null
  spotLabels?: GridSpotLabel[]
  emptyStock: boolean
  emptyDiscard: boolean
  onSettings: () => void
  /** Drawn over everything: a result card. */
  children?: ReactNode
}) {
  const ringColor = useTableColors().hintGreen
  const { cardWidth, cardHeight } = layout
  const slotStyle = (at: Point) => ({ left: at.x - cardWidth / 2, position: 'absolute' as const, top: at.y - cardHeight / 2 })
  return (
    <View style={StyleSheet.absoluteFill}>
      {emptyStock ? <EmptySlot style={slotStyle(layout.stock)} /> : null}
      {emptyDiscard ? <EmptySlot style={slotStyle(layout.discard)} /> : null}
      <TableCards key={dealKey} cards={cards} cardWidth={cardWidth} cardHeight={cardHeight} testID={`${game}-cards`} />
      {spotLabels?.map(({ key, at, text }) => (
        <View key={key} pointerEvents='none' style={[styles.spotLabel, { left: at.x - SPOT_LABEL_SIZE / 2, top: at.y - SPOT_LABEL_SIZE / 2, transform: [{ rotate: `${at.rotate}deg` }] }]}>
          <Text variant='labelLarge' style={styles.spotLabelText}>
            {text}
          </Text>
        </View>
      ))}
      {targets.map((target) => (
        <View key={`ring-${target.key}`} pointerEvents='none' style={[styles.ring, { borderColor: ringColor, height: cardHeight + RING_GAP * 2, left: target.at.x - cardWidth / 2 - RING_GAP, top: target.at.y - cardHeight / 2 - RING_GAP, width: cardWidth + RING_GAP * 2 }]} />
      ))}
      {([1, 2] as const).map((player) => (
        <PlayerLines key={player} game={game} player={player} layout={layout} label={labels[player]} prompt={prompts[player] ?? null} note={notes[player] ?? null} call={call?.player === player ? call : null} />
      ))}
      {targets.map((target) => {
        const rect = targetRect(layout, target.at)
        return <Pressable key={target.key} accessibilityRole='button' accessibilityLabel={target.label} onPress={target.onPress} style={[styles.target, { height: rect.height, left: rect.x, top: rect.y, width: rect.width }]} testID={`${game}-${target.key}`} />
      })}
      <TableSideButtons y={layout.center.y} onSettings={onSettings} />
      {children}
    </View>
  )
}

/** A player's name row, prompt line and note, each turned to face them. */
function PlayerLines({ game, player, layout, label, prompt, note, call }: { game: string; player: PlayerIndex; layout: GridTableLayout; label: GridLabel; prompt: string | null; note: string | null; call: GridCall | null }) {
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
        <View pointerEvents='none' style={[styles.note, { left: notePose.x - 60, top: notePose.y - 10, transform: [{ rotate: `${notePose.rotate}deg` }] }]}>
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
  note: { alignItems: 'center', height: 20, position: 'absolute', width: 120 },
  prompt: { color: CHROME_FG, flexShrink: 1, opacity: 0.85 },
  ring: { borderRadius: 12, borderWidth: 3, position: 'absolute' },
  spotLabel: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: SPOT_LABEL_SIZE / 2, height: SPOT_LABEL_SIZE, justifyContent: 'center', position: 'absolute', width: SPOT_LABEL_SIZE },
  spotLabelText: { color: '#fff' },
  target: { backgroundColor: 'transparent', position: 'absolute' }
})
