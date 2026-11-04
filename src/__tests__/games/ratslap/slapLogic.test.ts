import { type AnyCard, type Card, type Joker, type Rank, type Suit } from '@tastic/cards'

import { isDouble, isSandwich } from '@/games/ratslap/engine/slapLogic'

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: true }
}

function joker(idSuffix = ''): Joker {
  return { id: `joker${idSuffix}`, suit: 'joker', rank: null, faceUp: true }
}

describe('isDouble', () => {
  it('is false for a pile with fewer than 2 cards', () => {
    expect(isDouble([])).toBe(false)
    expect(isDouble([card(7)])).toBe(false)
  })

  it('is true when the top two cards share a rank', () => {
    const pile: AnyCard[] = [card(2), card(9, 'hearts'), card(7, 'clubs'), card(7, 'diamonds')]
    expect(isDouble(pile)).toBe(true)
  })

  it('is false when the top two cards have different ranks', () => {
    expect(isDouble([card(7, 'clubs'), card(9, 'diamonds')])).toBe(false)
  })

  it('treats two jokers on top as a double', () => {
    expect(isDouble([card(5), joker('-a'), joker('-b')])).toBe(true)
  })

  it('does not treat a joker and a numbered card as a double', () => {
    expect(isDouble([joker(), card(5)])).toBe(false)
  })

  it('only looks at the top two cards, ignoring matches further down the pile', () => {
    expect(isDouble([card(7, 'clubs'), card(7, 'diamonds'), card(9, 'hearts')])).toBe(false)
  })
})

describe('isSandwich', () => {
  it('is false for a pile with fewer than 3 cards', () => {
    expect(isSandwich([])).toBe(false)
    expect(isSandwich([card(7), card(9)])).toBe(false)
  })

  it('is true when the top card and the card two below it share a rank, whatever is between them', () => {
    expect(isSandwich([card(2), card(7, 'clubs'), card(9, 'hearts'), card(7, 'diamonds')])).toBe(true)
  })

  it('is false when the top card and the card two below it have different ranks', () => {
    expect(isSandwich([card(2), card(7, 'clubs'), card(9, 'hearts'), card(4, 'diamonds')])).toBe(false)
  })

  it('treats a joker-X-joker sandwich as a match', () => {
    expect(isSandwich([joker('-a'), card(9, 'hearts'), joker('-b')])).toBe(true)
  })

  it('does not treat a joker two below the top and a numbered top card as a sandwich', () => {
    expect(isSandwich([joker(), card(9, 'hearts'), card(5)])).toBe(false)
  })

  it('a double at the top is not by itself a sandwich', () => {
    expect(isSandwich([card(7, 'clubs'), card(2, 'hearts'), card(7, 'diamonds'), card(7, 'spades')])).toBe(false)
  })
})
