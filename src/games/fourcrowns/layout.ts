// Where everything sits on Four Crowns' table, in plain screen coordinates. Like Gin Rummy's, the table is drawn upright
// for whoever's turn it is (or whoever has the phone while a CPU plays): their hand across the bottom, its rank and suit
// showing on every card, with the buttons above it; each other player in a slot across the top, in turn order left to
// right, their hand a fan of backs over their name, their total, and what they took and threw last; the stock and the discard in a row between,
// with the round and its wild rank under them. Once a round is over the piles are swept off the table and every other
// hand is laid face up in a row of its own, top to bottom, so everyone can see what was left.

import { CARD_ASPECT } from '@tastic/cards'

import { type Point, type Pose } from '@/games/table/geometry'
import { type TableFrame } from '@/games/table/TableView'

/** One other player's place across the top, while a round is played. */
export interface CrownsSlot {
  /** The middle of the slot, and how wide it is. */
  x: number
  width: number
  /** The middle of the fan of backs, and of the first of the lines under it (name, total, took, threw). */
  fanY: number
  nameY: number
}

/** One other player's row once a round is over: their name line, then their hand face up. */
export interface CrownsRow {
  labelY: number
  handY: number
  lineY: number
}

export interface CrownsLayout extends TableFrame {
  width: number
  height: number
  stock: Point
  discard: Point
  /** Off the table's left edge, where the piles go once a round is over. */
  sweep: Pose
  /** The middle of the seated player's hand row, and the line under its melds. */
  handY: number
  meldLineY: number
  /** How far apart the cards in a face-up hand sit (each card's rank and suit show), and a fan of backs at most. */
  handStep: number
  backStep: number
  groupGap: number
  lift: number
  /** The middle of the buttons row, over the seated hand. */
  actionY: number
  /** The round and its wild rank, two lines under the piles. */
  roundY: number
  wildY: number
  /** The other players' slots, in turn order after the seated player. */
  slots: CrownsSlot[]
  /** The other players' rows once a round is over, in the same order, top to bottom. */
  rows: CrownsRow[]
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 40
/** A card in a face-up hand shows this share of its width past the next one: enough for its rank and suit. */
const HAND_STEP = 0.52
/** A fan of backs shows at most this share. */
const BACK_STEP = 0.3
/** Fourteen cards at most (thirteen and a draw), in up to five groups. */
const MOST_CARDS = 14
const MOST_GAPS = 4
const GROUP_GAP = 8
const SIDE_MARGIN = 14
const LABEL_ROOM = 34
const PROMPT_ROOM = 28
const ACTION_ROOM = 48
const LIFT = 14
const MIDDLE_GAP = 12
/** Under a slot's fan: the name, the total, what they took and what they threw. */
const SLOT_LINES = 4
const SLOT_LINE = 18
/** The round and wild lines under the piles. */
const BANNER_ROOM = 48
/** A round-over row: its name line, and the gap under its hand. */
const ROW_LABEL = 26
const ROW_GAP = 12

export function crownsLayout(width: number, height: number, insets: { top: number; bottom: number }, players: number): CrownsLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const others = players - 1
  const fitsWidth = (width - SIDE_MARGIN * 2 - MOST_GAPS * GROUP_GAP) / (1 + (MOST_CARDS - 1) * HAND_STEP)
  // While a round plays: three rows of cards (the slots, the piles, the hand) and the lines around them. Once it's over:
  // a row for each player. CARD_ASPECT is a card's width over its height.
  const seatedRoom = LABEL_ROOM + LIFT + ACTION_ROOM + PROMPT_ROOM
  const playing = (bottom - top - seatedRoom - SLOT_LINES * SLOT_LINE - 16 - BANNER_ROOM - MIDDLE_GAP * 2) / 3
  const over = (bottom - top - seatedRoom - others * (ROW_LABEL + ROW_GAP) - 8) / players
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, fitsWidth, playing * CARD_ASPECT, over * CARD_ASPECT)))
  const cardHeight = cardWidth / CARD_ASPECT

  const labelY = bottom - LABEL_ROOM / 2
  const handY = bottom - LABEL_ROOM - cardHeight / 2
  const actionY = handY - cardHeight / 2 - LIFT - ACTION_ROOM / 2
  const promptY = actionY - ACTION_ROOM / 2 - PROMPT_ROOM / 2

  const slotWidth = (width - SIDE_MARGIN * 2) / others
  const fanY = top + 8 + cardHeight / 2
  const slots: CrownsSlot[] = Array.from({ length: others }, (_, k) => ({ x: SIDE_MARGIN + slotWidth * (k + 0.5), width: slotWidth, fanY, nameY: fanY + cardHeight / 2 + 4 + SLOT_LINE / 2 }))
  const slotsBottom = fanY + cardHeight / 2 + 4 + SLOT_LINES * SLOT_LINE

  // The piles and the banner under them sit halfway between the slots and the prompt line.
  const middleTop = slotsBottom + MIDDLE_GAP
  const middleBottom = promptY - PROMPT_ROOM / 2 - MIDDLE_GAP
  const middleY = (middleTop + middleBottom) / 2 - BANNER_ROOM / 2
  const roundY = middleY + cardHeight / 2 + 16
  const center = { x: width / 2, y: middleY }

  const rows: CrownsRow[] = Array.from({ length: others }, (_, k) => {
    const rowTop = top + 8 + k * (ROW_LABEL + cardHeight + ROW_GAP)
    const rowHandY = rowTop + ROW_LABEL + cardHeight / 2
    return { labelY: rowTop + ROW_LABEL / 2, handY: rowHandY, lineY: rowHandY + cardHeight / 2 + 4 }
  })

  const notePose: Pose = { ...center, rotate: 0 }
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    labelY: { 1: labelY, 2: top },
    promptY: { 1: promptY, 2: top },
    notes: { 1: notePose, 2: notePose },
    upsideDown: false,
    stock: { x: center.x - cardWidth / 2 - MIDDLE_GAP / 2, y: middleY },
    discard: { x: center.x + cardWidth / 2 + MIDDLE_GAP / 2, y: middleY },
    sweep: { x: -cardWidth, y: middleY, rotate: -12 },
    handY,
    meldLineY: handY + cardHeight / 2 + 4,
    handStep: Math.round(cardWidth * HAND_STEP),
    backStep: Math.round(cardWidth * BACK_STEP),
    groupGap: GROUP_GAP,
    lift: LIFT,
    actionY,
    roundY,
    wildY: roundY + 22,
    slots,
    rows
  }
}

/** Where each card of a fan of backs lies in a slot: centered, as far apart as the slot allows, at most `backStep`. */
export function fanPoses(count: number, slot: CrownsSlot, layout: CrownsLayout): Pose[] {
  const room = slot.width - 12 - layout.cardWidth
  const step = count > 1 ? Math.max(0, Math.min(layout.backStep, room / (count - 1))) : 0
  const span = layout.cardWidth + (count - 1) * step
  const left = slot.x - span / 2 + layout.cardWidth / 2
  return Array.from({ length: count }, (_, i) => ({ x: left + i * step, y: slot.fanY, rotate: 0 }))
}
