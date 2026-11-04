import { type Card, isJoker, type Rank, type Suit } from '@tastic/cards'

import { dealHands, makeDeck, shuffledDeck } from '@/games/ratslap/engine/deck'

describe('makeDeck', () => {
  it('with jokers: 52 standard cards plus exactly 2 jokers, all face down, with unique ids', () => {
    const deck = makeDeck(true)
    expect(deck).toHaveLength(54)

    const jokers = deck.filter(isJoker)
    expect(jokers).toHaveLength(2)
    jokers.forEach((j) => expect(j.rank).toBeNull())

    deck.forEach((c) => expect(c.faceUp).toBe(false))
    expect(new Set(deck.map((c) => c.id)).size).toBe(54)
  })

  it('without jokers: the 52 standard cards alone', () => {
    const deck = makeDeck(false)
    expect(deck).toHaveLength(52)
    expect(deck.filter(isJoker)).toHaveLength(0)
  })

  it('covers all 13 ranks in each of the 4 suits exactly once', () => {
    const standard = makeDeck(true).filter((c): c is Card => !isJoker(c))
    const bySuit = new Map<Suit, Rank[]>()
    standard.forEach((c) => bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c.rank]))
    expect(bySuit.size).toBe(4)
    bySuit.forEach((ranks) => expect(ranks.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]))
  })
})

describe('shuffledDeck', () => {
  it('is deterministic for a given seed', () => {
    expect(shuffledDeck(42, true).map((c) => c.id)).toEqual(shuffledDeck(42, true).map((c) => c.id))
  })

  it('produces a different order for a different seed', () => {
    expect(shuffledDeck(1, true).map((c) => c.id)).not.toEqual(shuffledDeck(2, true).map((c) => c.id))
  })

  it('still contains every card after shuffling', () => {
    const deck = shuffledDeck(777, true)
    expect(deck).toHaveLength(54)
    expect(new Set(deck.map((c) => c.id)).size).toBe(54)
  })
})

describe('dealHands', () => {
  it.each([
    [true, 27],
    [false, 26]
  ])('jokers %s: splits the deck into two hands of %i with no overlap', (jokers, size) => {
    const [handOne, handTwo] = dealHands(shuffledDeck(99, jokers))
    expect(handOne).toHaveLength(size)
    expect(handTwo).toHaveLength(size)
    expect(new Set([...handOne, ...handTwo].map((c) => c.id)).size).toBe(size * 2)
  })
})
