// Where everything sits on RatSlap's table, in plain screen coordinates. The table never turns: the
// phone lies flat between two players at its short edges, player 1 at the bottom and player 2 (or the
// CPU) at the top, each with a deck near their own edge and the pile in the middle. So a touch's
// screen position and a card's are the same thing, with no frame to convert through.

import { CARD_ASPECT, faceUpFanOffset, RANK_INK_RIGHT_FRACTION } from '@tastic/cards'

import { wasteFanStep } from '@/components/wasteFan'
import { cardRect, cardTilt, type Point, type Pose, type Rect } from '@/games/table/geometry'

import type { PlayerIndex } from './engine/types'

export interface TableLayout {
  width: number
  height: number
  cardWidth: number
  cardHeight: number
  /** The middle of the table, between the two halves: the pile's center. */
  center: Point
  /** Each player's deck's center. */
  decks: Record<PlayerIndex, Point>
  /** The area a tap on a player's deck plays a card from: the deck with some room around it. Any
   * other tap in that player's half is a slap. */
  deckTargets: Record<PlayerIndex, Rect>
  /** How far apart the pile's fanned cards sit: each card under the top one shows its left `pileStep`
   * points, its rank whole. */
  pileStep: number
  /** How far above the pile a burned card sits, its corner row (rank and suit) showing over the pile. */
  burnedLift: number
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 52
/** From the screen's edge (inside the safe area) to the deck, leaving room for the player's name. */
const DECK_EDGE_MARGIN = 40
/** How far around the deck a tap still plays a card. */
const DECK_TARGET_SLOP = 16
/** The row a deck's challenge line ("Q · 2 tries left") takes on the pile's side of the deck. */
export const DECK_LABEL_ROOM = 30
/** How many of the pile's top cards fan out side by side: the top card and the two under it, enough
 * to see a double and a sandwich. */
export const PILE_FAN = 3
/** How many pile cards are drawn: the fan, and two more squared under its last card, so the one that
 * drops off the bottom is always hidden under two others. */
export const PILE_DRAWN = PILE_FAN + 2
/** A fanned card turns up to this many degrees either way, so the pile looks laid by hand. */
const PILE_TILT_MAX = 2.5
/** Room past the widest rank's ink for the tilt of the card over it (two cards, each turned up to
 * PILE_TILT_MAX, can close a step by about 6 points at the corner). */
const PILE_TILT_ROOM = 8
/** A burned card's corner row clears the pile's top edge by this much. */
const BURNED_CLEAR = 4
/** Clear felt between the pile (a burned card's corner row included) and a deck's challenge line. */
const PILE_DECK_GAP = 8

export function tableLayout(width: number, height: number, insets: { top: number; bottom: number }): TableLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const half = (bottom - top) / 2
  // Each half holds, from its edge in: the deck's margin, the deck, its challenge line, a gap, and half
  // the pile, with (on player 2's side) a burned card's corner row showing over it. CARD_ASPECT is a
  // card's width over its height.
  const fitsHalf = (half - DECK_EDGE_MARGIN - DECK_LABEL_ROOM - PILE_DECK_GAP - BURNED_CLEAR) / (1.5 / CARD_ASPECT + faceUpFanOffset(1))
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, width * 0.24, fitsHalf)))
  const cardHeight = cardWidth / CARD_ASPECT
  const center = { x: width / 2, y: top + half }
  const decks: Record<PlayerIndex, Point> = {
    1: { x: width / 2, y: bottom - DECK_EDGE_MARGIN - cardHeight / 2 },
    2: { x: width / 2, y: top + DECK_EDGE_MARGIN + cardHeight / 2 }
  }
  const target = (deck: Point): Rect => cardRect(deck, cardWidth, cardHeight, DECK_TARGET_SLOP)
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    center,
    decks,
    deckTargets: { 1: target(decks[1]), 2: target(decks[2]) },
    pileStep: Math.round(wasteFanStep(cardWidth, RANK_INK_RIGHT_FRACTION) + PILE_TILT_ROOM),
    burnedLift: Math.round(faceUpFanOffset(cardWidth) + BURNED_CLEAR)
  }
}

/** Which half of the table a point is in: player 1's (the bottom) or player 2's. */
export function halfAt(point: Point, layout: TableLayout): PlayerIndex {
  return point.y >= layout.center.y ? 1 : 2
}

/** A player's deck, as a card leaving it or arriving at it lies. Square to the table for both
 * players: a back reads the same either way up, and the deck itself is drawn square. */
export function deckPose(layout: TableLayout, player: PlayerIndex): Pose {
  return { ...layout.decks[player], rotate: 0 }
}

/** Where a pile card lies, `depth` cards down from the top of a pile of `count`. The top PILE_FAN
 * cards fan out left to right, the newest on the right, so the left edge of each card under it shows
 * its rank; the rest lie square under the last of them. The fan is centered on the table, so a short
 * pile spreads from the middle. */
export function pileCardPose(layout: TableLayout, depth: number, count: number, cardId: string): Pose {
  const fanned = Math.min(count, PILE_FAN)
  const slot = Math.min(depth, PILE_FAN - 1)
  return { x: layout.center.x + ((fanned - 1) / 2 - slot) * layout.pileStep, y: layout.center.y, rotate: depth < PILE_FAN ? pileTilt(cardId) : 0 }
}

/** Where a burned card lies: face up at the bottom of the pile, under its last card, raised so its
 * corner row shows above it. Every burned card lies in the same spot. */
export function burnedPose(layout: TableLayout, pileCount: number): Pose {
  const fanned = Math.min(pileCount, PILE_FAN)
  return { x: layout.center.x - ((Math.max(fanned, 1) - 1) / 2) * layout.pileStep, y: layout.center.y - layout.burnedLift, rotate: -3 }
}

/** The open felt between the pile and a player's deck: the middle of it (where that player's slap
 * label sits, and where "Slap!" shows) and how tall it is. Player 2's side keeps room for a burned
 * card's corner row above the pile. */
export function slapArea(layout: TableLayout, player: PlayerIndex): { y: number; height: number } {
  const { center, cardHeight, decks, burnedLift } = layout
  const [from, to] = player === 1 ? [center.y + cardHeight / 2, decks[1].y - cardHeight / 2 - DECK_LABEL_ROOM] : [decks[2].y + cardHeight / 2 + DECK_LABEL_ROOM, center.y - cardHeight / 2 - burnedLift]
  return { y: (from + to) / 2, height: to - from }
}

/** A fanned pile card's turn, in degrees: the same every time it's drawn, from its id, and at most
 * PILE_TILT_MAX either way, so it never covers the rank of the card beside it. */
export function pileTilt(cardId: string): number {
  return cardTilt(cardId, PILE_TILT_MAX)
}
