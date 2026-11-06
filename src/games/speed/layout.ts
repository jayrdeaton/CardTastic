// Where everything sits on Speed's table, in plain screen coordinates: each player's hand of five in a row near their own
// edge with their name under (or over) it, their draw pile just inside it, a prompt line, and across the middle the two
// side piles either side of the two center piles. Player 2's side is player 1's turned half a turn round the middle when
// two people face each other, and drawn upright against the CPU.

import { CARD_ASPECT } from '@tastic/cards'

import { type Point, type Pose } from '@/games/table/geometry'
import type { PlayerIndex } from '@/games/table/players'
import type { TableFrame } from '@/games/table/TableView'

import { HAND_SIZE } from './engine/types'

export interface SpeedLayout extends TableFrame {
  width: number
  height: number
  /** Each player's hand slots, left to right as they sit. */
  hands: Record<PlayerIndex, Pose[]>
  draws: Record<PlayerIndex, Pose>
  /** The two side piles, on the left and the right of the middle (as player 1 sits). */
  sides: [Pose, Pose]
  /** The two center piles, the first on the left. */
  centers: [Pose, Pose]
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 40
const LABEL_ROOM = 34
const HAND_GAP = 8
const DRAW_GAP = 10
const PROMPT_ROOM = 26
const SIDE_MARGIN = 14
/** Between the two center piles. */
const CENTER_GAP = 8
/** Between a side pile and its center pile. */
const SIDE_GAP = 12
/** The Home and Settings buttons sit at the two ends of the middle row. */
const SIDE_BUTTON_ROOM = 52

function turned(point: Point, center: Point): Point {
  return { x: center.x * 2 - point.x, y: center.y * 2 - point.y }
}

export function speedLayout(width: number, height: number, insets: { top: number; bottom: number }, upsideDown: boolean): SpeedLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const half = (bottom - top) / 2
  // Each half holds, from its edge in: the name row, the hand, the draw pile, the prompt line and half the middle row.
  // CARD_ASPECT is a card's width over its height.
  const fitsHeight = ((half - LABEL_ROOM - DRAW_GAP - PROMPT_ROOM - 6) / 2.5) * CARD_ASPECT
  const fitsHand = (width - SIDE_MARGIN * 2 - (HAND_SIZE - 1) * HAND_GAP) / HAND_SIZE
  const fitsMiddle = (width - SIDE_BUTTON_ROOM * 2 - CENTER_GAP - SIDE_GAP * 2) / 4
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, fitsHeight, fitsHand, fitsMiddle)))
  const cardHeight = cardWidth / CARD_ASPECT
  const center = { x: width / 2, y: top + half }

  const handY = bottom - LABEL_ROOM - cardHeight / 2
  const oneHand: Pose[] = Array.from({ length: HAND_SIZE }, (_, i) => ({ x: center.x + (i - (HAND_SIZE - 1) / 2) * (cardWidth + HAND_GAP), y: handY, rotate: 0 }))
  const oneDraw: Pose = { x: center.x, y: handY - cardHeight - DRAW_GAP, rotate: 0 }
  const oneLabelY = bottom - LABEL_ROOM / 2
  const onePromptY = oneDraw.y - cardHeight / 2 - 3 - PROMPT_ROOM / 2
  // Beside the draw pile, on its right as the player sits.
  const oneNote: Pose = { x: oneDraw.x + cardWidth / 2 + 70, y: oneDraw.y, rotate: 0 }
  const rotate = upsideDown ? 180 : 0
  // Against the CPU its side is mirrored top to bottom only, so it reads upright.
  const mirrored = (pose: Pose): Pose => (upsideDown ? { ...turned(pose, center), rotate } : { x: pose.x, y: center.y * 2 - pose.y, rotate: 0 })

  const centerOffset = cardWidth / 2 + CENTER_GAP / 2
  const sideOffset = centerOffset + cardWidth + SIDE_GAP
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    hands: { 1: oneHand, 2: oneHand.map(mirrored) },
    draws: { 1: oneDraw, 2: mirrored(oneDraw) },
    sides: [
      { x: center.x - sideOffset, y: center.y, rotate: 0 },
      { x: center.x + sideOffset, y: center.y, rotate: 0 }
    ],
    centers: [
      { x: center.x - centerOffset, y: center.y, rotate: 0 },
      { x: center.x + centerOffset, y: center.y, rotate: 0 }
    ],
    labelY: { 1: oneLabelY, 2: center.y * 2 - oneLabelY },
    promptY: { 1: onePromptY, 2: center.y * 2 - onePromptY },
    notes: { 1: oneNote, 2: { ...turned(oneNote, center), rotate: 180 } },
    upsideDown
  }
}
