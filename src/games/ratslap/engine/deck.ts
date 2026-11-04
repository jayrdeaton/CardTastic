// RatSlap's deck: one standard deck, plus two jokers when the rules have them.

import { type AnyCard, type Joker } from '@tastic/cards'

import { makeDeck as makeStandardDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'

/** 52 cards, or 54 with the jokers, all face down. */
export function makeDeck(jokers: boolean): AnyCard[] {
  const cards: AnyCard[] = makeStandardDeck()
  if (jokers) {
    const jokerCards: Joker[] = [
      { id: 'joker-0', suit: 'joker', rank: null, faceUp: false },
      { id: 'joker-1', suit: 'joker', rank: null, faceUp: false }
    ]
    cards.push(...jokerCards)
  }
  return cards
}

/** The same seed always gives the same order. */
export function shuffledDeck(seed: number, jokers: boolean): AnyCard[] {
  return shuffle(makeDeck(jokers), mulberry32(seed))
}

/** Half the deck to each player. A shuffled deck split in two halves is as random as one dealt a
 * card at a time. */
export function dealHands(deck: AnyCard[]): [AnyCard[], AnyCard[]] {
  const half = deck.length / 2
  return [deck.slice(0, half), deck.slice(half)]
}
