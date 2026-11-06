// Where everything sits on War's table, in plain screen coordinates: each player's deck near their own edge with their
// name under (or over) it, a prompt line toward the middle, and the battle across the middle, each player's cards in a
// row on their side of it. Player 2's side is player 1's turned half a turn round the middle when two people face each
// other, and drawn upright against the CPU.

import { CARD_ASPECT } from '@tastic/cards'

import { type Point, type Pose } from '@/games/table/geometry'
import type { PlayerIndex } from '@/games/table/players'
import type { TableFrame } from '@/games/table/TableView'

export interface WarLayout extends TableFrame {
  width: number
  height: number
  decks: Record<PlayerIndex, Pose>
  /** The middle of each player's battle row. */
  rows: Record<PlayerIndex, Point>
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 52
const LABEL_ROOM = 34
const PROMPT_ROOM = 26
const DECK_GAP = 8
/** Between the two battle rows. */
const MIDDLE_GAP = 16
/** The Home and Settings buttons sit at the two ends of the middle; a battle row never runs under them. */
const SIDE_BUTTON_ROOM = 56
/** How far apart the cards of a battle row sit, as a share of a card's width, when there's room: each card's corner
 * shows past the one over it. */
const ROW_STEP = 0.5

function turned(point: Point, center: Point): Point {
  return { x: center.x * 2 - point.x, y: center.y * 2 - point.y }
}

export function warLayout(width: number, height: number, insets: { top: number; bottom: number }, upsideDown: boolean): WarLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const half = (bottom - top) / 2
  // Each half holds, from its edge in: the name row, the deck, the prompt line, and the battle row. CARD_ASPECT is a
  // card's width over its height.
  const fitsHalf = ((half - LABEL_ROOM - DECK_GAP - PROMPT_ROOM - MIDDLE_GAP / 2) / 2) * CARD_ASPECT
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, width * 0.24, fitsHalf)))
  const cardHeight = cardWidth / CARD_ASPECT
  const center = { x: width / 2, y: top + half }
  const oneDeck: Pose = { x: center.x, y: bottom - LABEL_ROOM - cardHeight / 2, rotate: 0 }
  const oneRow = { x: center.x, y: center.y + MIDDLE_GAP / 2 + cardHeight / 2 }
  const oneLabelY = bottom - LABEL_ROOM / 2
  const onePromptY = oneDeck.y - cardHeight / 2 - DECK_GAP / 2 - PROMPT_ROOM / 2
  // Beside the deck, on its right as the player sits.
  const oneNote: Pose = { x: oneDeck.x + cardWidth / 2 + 70, y: oneDeck.y, rotate: 0 }
  const rotate = upsideDown ? 180 : 0
  // Against the CPU its side is mirrored top to bottom only, so it reads upright.
  const mirrored = (point: Point): Point => (upsideDown ? turned(point, center) : { x: point.x, y: center.y * 2 - point.y })
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    decks: { 1: oneDeck, 2: { ...mirrored(oneDeck), rotate } },
    rows: { 1: oneRow, 2: mirrored(oneRow) },
    labelY: { 1: oneLabelY, 2: center.y * 2 - oneLabelY },
    promptY: { 1: onePromptY, 2: center.y * 2 - onePromptY },
    notes: { 1: oneNote, 2: { ...turned(oneNote, center), rotate: 180 } },
    upsideDown
  }
}

/** Where the `index`th of a player's `count` battle cards lies: a row across their side of the middle, the first on the
 * left as they sit and each later one over it, a little to its right. It closes up to stay clear of the side buttons. */
export function battleCardPose(layout: WarLayout, player: PlayerIndex, index: number, count: number): Pose {
  const { rows, cardWidth, width, upsideDown } = layout
  const span = width - SIDE_BUTTON_ROOM * 2 - cardWidth
  const step = count > 1 ? Math.min(cardWidth * ROW_STEP, span / (count - 1)) : 0
  const offset = (index - (count - 1) / 2) * step
  const turnedRow = player === 2 && upsideDown
  return { x: turnedRow ? rows[player].x - offset : rows[player].x + offset, y: rows[player].y, rotate: turnedRow ? 180 : 0 }
}
