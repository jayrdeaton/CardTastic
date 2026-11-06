// Where everything sits on Gin Rummy's table, in plain screen coordinates. Unlike the other two-player tables nobody
// sits across from anyone: the phone is passed, so the table is drawn upright for whoever's turn it is. Their hand runs
// across the bottom, its rank and suit showing on every card, with the buttons above it; the other player's hand lies
// face down across the top; the stock and the discard sit in a row between.

import { CARD_ASPECT } from '@tastic/cards'

import { type Point, type Pose } from '@/games/table/geometry'
import { type HandGroup, handRowPoses, type MeldLine } from '@/games/table/HandRow'
import type { PlayerIndex } from '@/games/table/players'
import { type TableFrame } from '@/games/table/TableView'

export interface GinLayout extends TableFrame {
  width: number
  height: number
  stock: Point
  discard: Point
  /** The middle of each player's hand row: the one seated at the bottom (whose turn it is), and the other at the top. */
  handY: Record<PlayerIndex, number>
  /** How far apart the cards in the bottom hand sit (each card's rank and suit show), and the top hand's backs. */
  handStep: number
  backStep: number
  /** Extra room between one meld and the next. */
  groupGap: number
  /** How far a picked card rises out of the hand. */
  lift: number
  /** The middle of the buttons row, over the bottom hand. */
  actionY: number
  /** Where the line under a meld sits, under the bottom hand and over the top one. */
  meldLineY: Record<PlayerIndex, number>
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 40
/** A card in hand shows this share of its width past the next one: enough for its rank and suit. */
const HAND_STEP = 0.52
/** A face-down hand's cards show this share. */
const BACK_STEP = 0.3
/** Eleven cards at most (after a draw), in up to four groups. */
const MOST_CARDS = 11
const MOST_GAPS = 3
const GROUP_GAP = 8
const SIDE_MARGIN = 14
const LABEL_ROOM = 34
const PROMPT_ROOM = 28
const ACTION_ROOM = 48
const LIFT = 14
const MIDDLE_GAP = 12

export function ginLayout(width: number, height: number, insets: { top: number; bottom: number }, seated: PlayerIndex): GinLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const fitsWidth = (width - SIDE_MARGIN * 2 - MOST_GAPS * GROUP_GAP) / (1 + (MOST_CARDS - 1) * HAND_STEP)
  // Three rows of cards (both hands and the middle row), and from the bottom up: the name row, the lift, the buttons and
  // the prompt; from the top down: the name row and a prompt line. CARD_ASPECT is a card's width over its height.
  const fitsHeight = ((bottom - top - LABEL_ROOM * 2 - LIFT - ACTION_ROOM - PROMPT_ROOM * 2 - MIDDLE_GAP * 2) / 3) * CARD_ASPECT
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, fitsWidth, fitsHeight)))
  const cardHeight = cardWidth / CARD_ASPECT
  const other: PlayerIndex = seated === 1 ? 2 : 1

  const seatedLabelY = bottom - LABEL_ROOM / 2
  const seatedHandY = bottom - LABEL_ROOM - cardHeight / 2
  const actionY = seatedHandY - cardHeight / 2 - LIFT - ACTION_ROOM / 2
  const seatedPromptY = actionY - ACTION_ROOM / 2 - PROMPT_ROOM / 2
  const otherLabelY = top + LABEL_ROOM / 2
  const otherHandY = top + LABEL_ROOM + cardHeight / 2
  const otherPromptY = otherHandY + cardHeight / 2 + PROMPT_ROOM / 2
  // The stock and the discard sit halfway between the two prompt lines.
  const middleY = (otherPromptY + PROMPT_ROOM / 2 + seatedPromptY - PROMPT_ROOM / 2) / 2
  const center = { x: width / 2, y: middleY }
  // Under the piles, clear of the ring round a pile that can be drawn from.
  const note: Pose = { x: center.x, y: middleY + cardHeight / 2 + 20, rotate: 0 }
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    stock: { x: center.x - cardWidth / 2 - MIDDLE_GAP / 2, y: middleY },
    discard: { x: center.x + cardWidth / 2 + MIDDLE_GAP / 2, y: middleY },
    labelY: { [seated]: seatedLabelY, [other]: otherLabelY } as Record<PlayerIndex, number>,
    promptY: { [seated]: seatedPromptY, [other]: otherPromptY } as Record<PlayerIndex, number>,
    notes: { 1: note, 2: note },
    upsideDown: false,
    handY: { [seated]: seatedHandY, [other]: otherHandY } as Record<PlayerIndex, number>,
    handStep: Math.round(cardWidth * HAND_STEP),
    backStep: Math.round(cardWidth * BACK_STEP),
    groupGap: GROUP_GAP,
    lift: LIFT,
    actionY,
    meldLineY: { [seated]: seatedHandY + cardHeight / 2 + 4, [other]: otherHandY + cardHeight / 2 + 4 } as Record<PlayerIndex, number>
  }
}

/** Where each card of a hand lies: in a row centered across the table, the picked card risen. Also the stretch of each
 * marked group, for its line. */
export function handPoses(groups: HandGroup[], layout: GinLayout, player: PlayerIndex, { step, gap }: { step: number; gap: number }, picked: string | null): { poses: Map<string, Pose>; lines: MeldLine[] } {
  return handRowPoses(groups, { centerX: layout.width / 2, y: layout.handY[player], cardWidth: layout.cardWidth, step, gap, lift: layout.lift }, picked)
}
