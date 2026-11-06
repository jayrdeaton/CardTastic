// Where everything sits on Crazy Eights' table, in plain screen coordinates. Like Four Crowns', the table is drawn
// upright for whoever's turn it is (or whoever has the phone while a CPU plays): their hand across the bottom, sorted by
// suit, in one row or (once it's long) two, with the cards that fit raised on their turn and the suit picker over it;
// each other player in a slot across the top, in turn order left to right, their hand a fan of backs over their name,
// how many cards they hold and what they did last; the stock and the discard in a row between, with the suit to follow
// under them.

import { CARD_ASPECT } from '@tastic/cards'

import { type Point, type Pose } from '@/games/table/geometry'
import { type TableFrame } from '@/games/table/TableView'

export interface EightsSlot {
  /** The middle of the slot, and how wide it is. */
  x: number
  width: number
  /** The middle of the fan of backs, and of the first of the lines under it (name, cards, last move). */
  fanY: number
  nameY: number
}

export interface EightsLayout extends TableFrame {
  width: number
  height: number
  stock: Point
  discard: Point
  /** The middle of the hand's front row, and how far up its back row sits. */
  handY: number
  rowOffset: number
  /** How far apart a face-up hand's cards sit (each card's rank and suit show), and a fan of backs at most. */
  handStep: number
  backStep: number
  /** How far a card that fits rises on its owner's turn. */
  lift: number
  /** The middle of the suit picker, over the hand. */
  actionY: number
  /** The suit to follow and the way play goes, two lines under the piles. */
  suitY: number
  directionY: number
  /** The other players' slots, in turn order after the seated player. */
  slots: EightsSlot[]
  /** Room for the hand from side to side. */
  handLeft: number
  handRight: number
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 40
/** A card in a face-up hand shows this share of its width past the next one: enough for its rank and suit. */
const HAND_STEP = 0.52
/** A fan of backs shows at most this share. */
const BACK_STEP = 0.3
/** A row sized for this many cards at full spacing; past it the hand takes two rows. */
const ROW_CARDS = 9
/** The back row sits this share of a card's height above the front one: its rank and its suit mark (HandRow's
 * HandSuitMarks) show over it, even under a raised card. */
const ROW_OFFSET = 0.62
const SIDE_MARGIN = 14
const LABEL_ROOM = 34
const PROMPT_ROOM = 28
const ACTION_ROOM = 56
const LIFT = 12
const MIDDLE_GAP = 12
/** Under a slot's fan: the name, the cards in hand, and what they did last. */
const SLOT_LINES = 3
const SLOT_LINE = 18
/** The suit and direction lines under the piles. */
const BANNER_ROOM = 52

export function eightsLayout(width: number, height: number, insets: { top: number; bottom: number }, players: number): EightsLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const others = players - 1
  const fitsWidth = (width - SIDE_MARGIN * 2) / (1 + (ROW_CARDS - 1) * HAND_STEP)
  // Three rows of cards (the slots, the piles, the hand's front row), the hand's back row and the lines around them.
  // CARD_ASPECT is a card's width over its height.
  const lines = LABEL_ROOM + LIFT + ACTION_ROOM + PROMPT_ROOM + SLOT_LINES * SLOT_LINE + 12 + BANNER_ROOM + MIDDLE_GAP * 2
  const fitsHeight = ((bottom - top - lines) / (3 + ROW_OFFSET)) * CARD_ASPECT
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, fitsWidth, fitsHeight)))
  const cardHeight = cardWidth / CARD_ASPECT
  const rowOffset = Math.round(cardHeight * ROW_OFFSET)

  const labelY = bottom - LABEL_ROOM / 2
  const handY = bottom - LABEL_ROOM - cardHeight / 2
  const actionY = handY - rowOffset - cardHeight / 2 - LIFT - ACTION_ROOM / 2
  const promptY = actionY - ACTION_ROOM / 2 - PROMPT_ROOM / 2

  const slotWidth = (width - SIDE_MARGIN * 2) / Math.max(1, others)
  const fanY = top + 8 + cardHeight / 2
  const slots: EightsSlot[] = Array.from({ length: others }, (_, k) => ({ x: SIDE_MARGIN + slotWidth * (k + 0.5), width: slotWidth, fanY, nameY: fanY + cardHeight / 2 + 4 + SLOT_LINE / 2 }))
  const slotsBottom = fanY + cardHeight / 2 + 4 + SLOT_LINES * SLOT_LINE

  // The piles and the lines under them sit halfway between the slots and the prompt line.
  const middleTop = slotsBottom + MIDDLE_GAP
  const middleBottom = promptY - PROMPT_ROOM / 2 - MIDDLE_GAP
  const middleY = (middleTop + middleBottom) / 2 - BANNER_ROOM / 2
  const suitY = middleY + cardHeight / 2 + 18
  const center = { x: width / 2, y: middleY }

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
    handY,
    rowOffset,
    handStep: Math.round(cardWidth * HAND_STEP),
    backStep: Math.round(cardWidth * BACK_STEP),
    lift: LIFT,
    actionY,
    suitY,
    directionY: suitY + 24,
    slots,
    handLeft: SIDE_MARGIN,
    handRight: width - SIDE_MARGIN
  }
}

/** Where each card of a face-up hand lies, in the order given: one row while they fit at full spacing, else two, the
 * first half in the back row; a row too long even then closes up to fit. `raised` cards sit `lift` higher. */
export function handPoses(count: number, layout: EightsLayout, raised: (index: number) => boolean): Pose[] {
  const room = layout.handRight - layout.handLeft - layout.cardWidth
  const perRow = Math.floor(room / layout.handStep) + 1
  const rows = count > perRow ? 2 : 1
  const backCount = rows === 2 ? Math.ceil(count / 2) : 0
  const poses: Pose[] = []
  const row = (start: number, length: number, y: number) => {
    const step = length > 1 ? Math.min(layout.handStep, room / (length - 1)) : 0
    const span = layout.cardWidth + (length - 1) * step
    const left = layout.width / 2 - span / 2 + layout.cardWidth / 2
    for (let i = 0; i < length; i++) poses.push({ x: left + i * step, y: raised(start + i) ? y - layout.lift : y, rotate: 0 })
  }
  if (rows === 2) row(0, backCount, layout.handY - layout.rowOffset)
  row(backCount, count - backCount, layout.handY)
  return poses
}

/** Where each card of a fan of backs lies in a slot: centered, as far apart as the slot allows, at most `backStep`. */
export function fanPoses(count: number, slot: EightsSlot, layout: EightsLayout): Pose[] {
  const room = slot.width - 12 - layout.cardWidth
  const step = count > 1 ? Math.max(0, Math.min(layout.backStep, room / (count - 1))) : 0
  const span = layout.cardWidth + (count - 1) * step
  const left = slot.x - span / 2 + layout.cardWidth / 2
  return Array.from({ length: count }, (_, i) => ({ x: left + i * step, y: slot.fanY, rotate: 0 }))
}
