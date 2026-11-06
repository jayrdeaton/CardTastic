// A hand on a table (Gin Rummy, Four Crowns, Crazy Eights): the cards in a row arranged into groups (its melds, each
// with a line under it, then the rest), the card picked to throw risen out of the row, the buttons over it, and each
// covered card's suit marked under its rank.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { type AnyCard, cardFaceColor, isJoker, rankLabel, type Suit, SUIT_SYMBOLS, suitInk, SuitPip } from '@tastic/cards'
import { StyleSheet, View } from 'react-native'

import { CHROME_FG_MUTED, useTableColors } from '@/components/theme'
import { useSettings } from '@/hooks/useSettings'

import type { Pose } from './geometry'
import type { TableCardSpec } from './TableCards'

/** A card as a prompt names it: 7♦, Q♠, Joker. */
export function cardName(card: AnyCard): string {
  return isJoker(card) ? 'Joker' : `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`
}

/** A hand laid out in groups (its melds, then the rest), left to right. */
export interface HandGroup {
  cards: AnyCard[]
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

/** Where a covered hand card's suit mark sits, and which suit. */
export interface SuitMarkSpot {
  key: string
  /** The mark's top-left corner. */
  left: number
  top: number
  suit: Suit
}

/** The mark's box, as a share of the card's width: under the corner's rank, over the left strip a covered card shows. */
const MARK_LEFT = 0.08
const MARK_TOP = 0.44
const MARK_SIZE = 0.3

/** The face-up cards whose suit doesn't show: every card style draws its corner pip at the top right, which a card on
 * top of it in the same row covers (the rank, at the top left, shows). Each gets a mark under its rank. A card covered
 * so closely that the mark would reach the card over it (a long hand closed up) gets none. */
export function suitMarkSpots(cards: readonly TableCardSpec[], cardWidth: number, cardHeight: number): SuitMarkSpot[] {
  const spots: SuitMarkSpot[] = []
  cards.forEach(({ card, pose, faceUp }, i) => {
    if (!faceUp || isJoker(card)) return
    // How far right of it each card drawn on top of it in its row starts, if that covers its corner pip.
    const over = cards
      .slice(i + 1)
      .filter((other) => Math.abs(other.pose.y - pose.y) < cardHeight / 2)
      .map((other) => other.pose.x - pose.x)
      .filter((dx) => dx > 0 && dx < cardWidth * 0.9)
    if (over.length === 0 || Math.min(...over) < cardWidth * (MARK_LEFT + MARK_SIZE)) return
    spots.push({ key: card.id, left: pose.x - cardWidth / 2 + cardWidth * MARK_LEFT, top: pose.y - cardHeight / 2 + cardWidth * MARK_TOP, suit: card.suit })
  })
  return spots
}

/** The suit marks, each on a patch of the card's own face color, in the ink its card draws the suit in (the player's
 * card style, and Invert Dark Mode Colors in dark mode). */
export function HandSuitMarks({ game, spots, cardWidth }: { game: string; spots: SuitMarkSpot[]; cardWidth: number }) {
  const { settings } = useSettings()
  const { dark } = useAutoPaperTheme()
  const colors = useTableColors()
  const invertDarkModeColors = settings.invertDarkModeColors && dark
  const options = { cardStyle: settings.cardStyle, invertDarkModeColors }
  const size = cardWidth * MARK_SIZE
  const face = cardFaceColor(colors, invertDarkModeColors)
  return (
    <>
      {spots.map(({ key, left, top, suit }) => (
        <View key={key} pointerEvents='none' style={[styles.mark, { backgroundColor: face, height: size, left, top, width: size }]} testID={`${game}-suit-mark`}>
          <SuitPip suit={suit} color={suitInk(suit, colors, options)} size={size * 0.82} theme={settings.cardStyle === 'tarot' ? 'tarot' : 'standard'} />
        </View>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  action: { minWidth: 96 },
  actions: { flexDirection: 'row', gap: 12, height: 40, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  mark: { alignItems: 'center', borderRadius: 3, justifyContent: 'center', position: 'absolute' },
  meldLine: { borderRadius: MELD_LINE_HEIGHT / 2, height: MELD_LINE_HEIGHT, position: 'absolute' }
})
