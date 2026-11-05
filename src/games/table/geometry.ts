// Plain screen geometry for the two-player tables (RatSlap, Slapjack, Six-Card Golf, Trash). A table never turns with
// the phone: it lies flat between two players at its short edges, so a touch's screen position and a card's are the same
// thing, with no frame to convert through.

export interface Point {
  x: number
  y: number
}

/** Where a card lies: its center, and how far it's turned (degrees). */
export interface Pose extends Point {
  rotate: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function inRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

/** The card-sized rect a card at `point` covers, grown by `slop` on every side. */
export function cardRect(point: Point, cardWidth: number, cardHeight: number, slop = 0): Rect {
  return { x: point.x - cardWidth / 2 - slop, y: point.y - cardHeight / 2 - slop, width: cardWidth + slop * 2, height: cardHeight + slop * 2 }
}

/** A card's turn on a pile, in degrees: the same every time it's drawn, from its id, and at most `max` either way, so a
 * pile looks laid by hand. */
export function cardTilt(cardId: string, max: number): number {
  let hash = 2166136261
  for (let i = 0; i < cardId.length; i++) hash = Math.imul(hash ^ cardId.charCodeAt(i), 16777619)
  return Math.round(((((hash >>> 0) & 0xff) / 255) * 2 - 1) * max * 2) / 2
}
