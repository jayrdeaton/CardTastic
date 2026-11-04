// Where everything sits on RatSlap's table, in plain screen coordinates. The table never turns: the
// phone lies flat between two players at its short edges, player 1 at the bottom and player 2 (or the
// CPU) at the top, each with a deck near their own edge and the pile in the middle. So a touch's
// screen position and a card's are the same thing, with no frame to convert through.

import { CARD_ASPECT } from '@tastic/cards'

import type { PlayerIndex } from './engine/types'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

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
}

const CARD_WIDTH_MAX = 96
const CARD_WIDTH_MIN = 52
/** From the screen's edge (inside the safe area) to the deck, leaving room for the player's name. */
const DECK_EDGE_MARGIN = 40
/** How far around the deck a tap still plays a card. */
const DECK_TARGET_SLOP = 16

export function tableLayout(width: number, height: number, insets: { top: number; bottom: number }): TableLayout {
  const top = insets.top
  const bottom = height - insets.bottom
  const half = (bottom - top) / 2
  // Each half holds a deck, the player's labels and half the pile, with a gap between deck and pile.
  // CARD_ASPECT is a card's width over its height.
  const cardWidth = Math.round(Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, width * 0.24, (half * CARD_ASPECT) / 1.9)))
  const cardHeight = cardWidth / CARD_ASPECT
  const center = { x: width / 2, y: top + half }
  const decks: Record<PlayerIndex, Point> = {
    1: { x: width / 2, y: bottom - DECK_EDGE_MARGIN - cardHeight / 2 },
    2: { x: width / 2, y: top + DECK_EDGE_MARGIN + cardHeight / 2 }
  }
  const target = (deck: Point): Rect => ({ x: deck.x - cardWidth / 2 - DECK_TARGET_SLOP, y: deck.y - cardHeight / 2 - DECK_TARGET_SLOP, width: cardWidth + DECK_TARGET_SLOP * 2, height: cardHeight + DECK_TARGET_SLOP * 2 })
  return { width, height, cardWidth, cardHeight, center, decks, deckTargets: { 1: target(decks[1]), 2: target(decks[2]) } }
}

export function inRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

/** Which half of the table a point is in: player 1's (the bottom) or player 2's. */
export function halfAt(point: Point, layout: TableLayout): PlayerIndex {
  return point.y >= layout.center.y ? 1 : 2
}

/** A card on the pile lies a little askew, the same way every time it's drawn: turned up to 14
 * degrees and nudged up to 6 points, from its id. So neither player reads the pile upside down, and
 * a new card on the pile is easy to tell from the one under it. */
export function pileTilt(cardId: string): { rotate: number; dx: number; dy: number } {
  let hash = 2166136261
  for (let i = 0; i < cardId.length; i++) hash = Math.imul(hash ^ cardId.charCodeAt(i), 16777619)
  const unit = (shift: number) => (((hash >>> shift) & 0xff) / 255) * 2 - 1
  return { rotate: Math.round(unit(0) * 14), dx: Math.round(unit(8) * 6), dy: Math.round(unit(16) * 6) }
}
