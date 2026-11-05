// The slap patterns, on a pile of played cards (bottom to top): RatSlap's double and sandwich, and
// Slapjack's Jack. Two jokers match each other, though neither has a rank; a joker never matches a
// ranked card.

import { type AnyCard, isJoker } from '@tastic/cards'

function isMatch(a: AnyCard, b: AnyCard): boolean {
  if (isJoker(a) || isJoker(b)) return isJoker(a) && isJoker(b)
  return a.rank === b.rank
}

/** The top two cards match. */
export function isDouble(pile: AnyCard[]): boolean {
  if (pile.length < 2) return false
  return isMatch(pile[pile.length - 1], pile[pile.length - 2])
}

/** The top card matches the card two below it, whatever is between them. */
export function isSandwich(pile: AnyCard[]): boolean {
  if (pile.length < 3) return false
  return isMatch(pile[pile.length - 1], pile[pile.length - 3])
}

/** A Jack is on top. */
export function isJackOnTop(pile: AnyCard[]): boolean {
  const top = pile[pile.length - 1]
  return !!top && !isJoker(top) && top.rank === 11
}
