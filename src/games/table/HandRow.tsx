// A rummy hand on a table (Gin Rummy, Four Crowns): the cards in a row arranged into groups (its melds, each with a
// line under it, then the rest), the card picked to throw risen out of the row, and the buttons over it.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { type Card, rankLabel, SUIT_SYMBOLS } from '@tastic/cards'
import { StyleSheet, View } from 'react-native'

import { CHROME_FG_MUTED, useTableColors } from '@/components/theme'

import type { Pose } from './geometry'

/** A card as a prompt names it: 7♦, Q♠. */
export function cardName(card: Card): string {
  return `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`
}

/** A hand laid out in groups (its melds, then the rest), left to right. */
export interface HandGroup {
  cards: Card[]
  /** Marked with a line under it: a meld (or, once a Gin Rummy hand is over, the cards laid off). */
  kind: 'meld' | 'laidOff' | 'loose'
}

/** A line under a marked group of a hand, from its first card's left edge to as far as its last card shows. */
export interface MeldLine {
  kind: HandGroup['kind']
  left: number
  right: number
}

/** Where a hand's row sits: centered on `centerX` at `y`, a group's cards `step` apart and each group `gap` further on,
 * the picked card `lift` higher. */
export interface HandRowFrame {
  centerX: number
  y: number
  cardWidth: number
  step: number
  gap: number
  lift: number
}

/** Where each card of a hand lies, and the stretch of each marked group, for its line. */
export function handRowPoses(groups: HandGroup[], { centerX, y, cardWidth, step, gap, lift }: HandRowFrame, picked: string | null): { poses: Map<string, Pose>; lines: MeldLine[] } {
  const filled = groups.filter((group) => group.cards.length > 0)
  const count = filled.reduce((sum, group) => sum + group.cards.length, 0)
  const span = count === 0 ? 0 : cardWidth + (count - 1) * step + (filled.length - 1) * gap
  let x = centerX - span / 2 + cardWidth / 2
  const poses = new Map<string, Pose>()
  const lines: MeldLine[] = []
  filled.forEach((group, g) => {
    const left = x - cardWidth / 2
    group.cards.forEach((card, i) => {
      poses.set(card.id, { x, y: card.id === picked ? y - lift : y, rotate: 0 })
      if (i < group.cards.length - 1) x += step
    })
    const last = g === filled.length - 1
    // A group's last card shows only up to where the next group's first card covers it.
    const right = last ? x + cardWidth / 2 : x - cardWidth / 2 + step
    if (group.kind !== 'loose') lines.push({ kind: group.kind, left, right })
    x += step + gap
  })
  return { poses, lines }
}

const MELD_LINE_HEIGHT = 3

/** The line under each meld of a hand showing its face: the hint ring's color under a meld, muted under the cards laid
 * off on another hand's melds. */
export function MeldLines({ game, lines }: { game: string; lines: (MeldLine & { y: number })[] }) {
  const ringColor = useTableColors().hintGreen
  return (
    <>
      {lines.map(({ kind, left, right, y }) => (
        <View key={`${kind}-${left}-${y}`} pointerEvents='none' style={[styles.meldLine, { backgroundColor: kind === 'meld' ? ringColor : CHROME_FG_MUTED, left: left + 2, top: y - MELD_LINE_HEIGHT / 2, width: Math.max(0, right - left - 4) }]} testID={`${game}-${kind}-line`} />
      ))}
    </>
  )
}

/** A button over the hand. */
export interface HandAction {
  key: string
  label: string
  primary: boolean
  disabled?: boolean
  onPress: () => void
}

/** The buttons over the hand, centered in a row around `y`. */
export function ActionRow({ game, actions, y }: { game: string; actions: HandAction[]; y: number }) {
  const { colors } = useAutoPaperTheme()
  return (
    <View pointerEvents='box-none' style={[styles.actions, { top: y - 20 }]}>
      {actions.map(({ key, label, primary, disabled, onPress }) => (
        <Button key={key} mode='contained' compact disabled={disabled} onPress={onPress} buttonColor={primary ? colors.primary : colors.surface} textColor={primary ? colors.onPrimary : colors.onSurface} style={styles.action} testID={`${game}-${key}`}>
          {label}
        </Button>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  action: { minWidth: 96 },
  actions: { flexDirection: 'row', gap: 12, height: 40, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  meldLine: { borderRadius: MELD_LINE_HEIGHT / 2, height: MELD_LINE_HEIGHT, position: 'absolute' }
})
