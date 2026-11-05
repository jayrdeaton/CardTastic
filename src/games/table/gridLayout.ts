// Where everything sits on a grid table (Six-Card Golf, Trash), in plain screen coordinates: each player's cards in rows
// near their own edge, their name under (or over) them, and the stock, the discard and the card in hand in a row across
// the middle. Player 1 sits at the bottom. Player 2 sits at the top: face to face, their side is player 1's turned half
// a turn round the table's middle, so it reads the right way up for them; against the CPU it's drawn upright, so the
// person can read it.

import { CARD_ASPECT } from '@tastic/cards'

import { cardRect, type Point, type Pose, type Rect } from './geometry'
import type { PlayerIndex } from './players'

export interface GridTableLayout {
  width: number
  height: number
  cardWidth: number
  cardHeight: number
  /** The middle of the table. */
  center: Point
  stock: Point
  discard: Point
  /** Where the card in hand sits on a player's turn: between the stock and the discard, nudged toward them. */
  held: Record<PlayerIndex, Pose>
  /** Each player's spots, by index in their own reading order: row by row from their far row, left to right as they sit. */
  slots: Record<PlayerIndex, Pose[]>
  /** The middle of each player's name row, at their own edge. */
  labelY: Record<PlayerIndex, number>
  /** The middle of each player's prompt line, between their cards and the middle row. */
  promptY: Record<PlayerIndex, number>
  /** Where a note about the match ("Hole 3 of 9") sits for each person: beside the middle row, on their side. */
  notes: Record<PlayerIndex, Pose>
  /** Whether player 2's side is turned to face them. */
  upsideDown: boolean
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 40
/** A player's name row, at their own edge. */
const LABEL_ROOM = 36
/** A player's prompt line, between their cards and the middle row. */
const PROMPT_ROOM = 28
const ROW_GAP = 8
const COLUMN_GAP = 8
const SIDE_MARGIN = 14
const MIDDLE_GAP = 14
/** The Home and Settings buttons sit at the two ends of the middle row. */
const SIDE_BUTTON_ROOM = 52
/** How far toward its player the card in hand sits, as a share of a card's height. */
const HELD_NUDGE = 0.3
/** Clear felt between the card in hand and a player's prompt line. */
const HELD_GAP = 6

function turned(point: Point, center: Point): Point {
  return { x: center.x * 2 - point.x, y: center.y * 2 - point.y }
}

export function gridTableLayout(width: number, height: number, insets: { top: number; bottom: number }, { columns, rows, upsideDown }: { columns: number; rows: number; upsideDown: boolean }): GridTableLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const half = (bottom - top) / 2
  // Each half holds, from its edge in: the name row, the rows of cards, the prompt line, and the card in hand's share of
  // the middle row. CARD_ASPECT is a card's width over its height.
  const fitsHeight = ((half - LABEL_ROOM - PROMPT_ROOM - (rows - 1) * ROW_GAP - HELD_GAP) / (rows + 0.5 + HELD_NUDGE)) * CARD_ASPECT
  const fitsColumns = (width - SIDE_MARGIN * 2 - (columns - 1) * COLUMN_GAP) / columns
  const fitsMiddle = (width - SIDE_BUTTON_ROOM * 2 - MIDDLE_GAP * 2) / 3
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, fitsHeight, fitsColumns, fitsMiddle)))
  const cardHeight = cardWidth / CARD_ASPECT
  const center = { x: width / 2, y: top + half }

  // Player 1's side, from the bottom edge up.
  const gridWidth = columns * cardWidth + (columns - 1) * COLUMN_GAP
  const columnX = (column: number) => center.x - gridWidth / 2 + cardWidth / 2 + column * (cardWidth + COLUMN_GAP)
  const nearRowY = bottom - LABEL_ROOM - cardHeight / 2
  const rowY = (row: number) => nearRowY - (rows - 1 - row) * (cardHeight + ROW_GAP)
  const oneSlots: Pose[] = []
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) oneSlots.push({ x: columnX(column), y: rowY(row), rotate: 0 })
  const oneLabelY = bottom - LABEL_ROOM / 2
  const onePromptY = rowY(0) - cardHeight / 2 - PROMPT_ROOM / 2
  const stock = { x: center.x - cardWidth - MIDDLE_GAP, y: center.y }
  const discard = { x: center.x + cardWidth + MIDDLE_GAP, y: center.y }
  const oneHeld: Pose = { x: center.x, y: center.y + cardHeight * HELD_NUDGE, rotate: 0 }
  const oneNote: Pose = { x: stock.x, y: center.y + cardHeight / 2 + 12, rotate: 0 }

  // Player 2's side: player 1's turned round the middle, or drawn upright from the top edge down.
  let twoSlots: Pose[]
  let twoLabelY: number
  let twoPromptY: number
  if (upsideDown) {
    twoSlots = oneSlots.map((pose) => ({ ...turned(pose, center), rotate: 180 }))
    twoLabelY = center.y * 2 - oneLabelY
    twoPromptY = center.y * 2 - onePromptY
  } else {
    const twoRowY = (row: number) => top + LABEL_ROOM + cardHeight / 2 + row * (cardHeight + ROW_GAP)
    twoSlots = []
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) twoSlots.push({ x: columnX(column), y: twoRowY(row), rotate: 0 })
    twoLabelY = top + LABEL_ROOM / 2
    twoPromptY = twoRowY(rows - 1) + cardHeight / 2 + PROMPT_ROOM / 2
  }
  const turnedRotate = upsideDown ? 180 : 0
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    stock,
    discard,
    held: { 1: oneHeld, 2: { x: center.x, y: center.y - cardHeight * HELD_NUDGE, rotate: turnedRotate } },
    slots: { 1: oneSlots, 2: twoSlots },
    labelY: { 1: oneLabelY, 2: twoLabelY },
    promptY: { 1: onePromptY, 2: twoPromptY },
    notes: { 1: oneNote, 2: { ...turned(oneNote, center), rotate: 180 } },
    upsideDown
  }
}

/** The area a tap on a card at `point` lands in. */
export function targetRect(layout: GridTableLayout, point: Point): Rect {
  return cardRect(point, layout.cardWidth, layout.cardHeight, 4)
}
