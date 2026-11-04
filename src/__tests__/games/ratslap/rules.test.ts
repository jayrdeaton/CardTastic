import { type Card, type Joker, type Rank, type Suit } from '@tastic/cards'

import { cardCount, collectPile, createInitialState, isOut, isPlayable, isSlappable, playCard, slap, slapPattern, toPlay } from '@/games/ratslap/engine/rules'
import { DEFAULT_RULES, type RatSlapRules, type RatSlapState } from '@/games/ratslap/engine/types'

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: true }
}

function joker(idSuffix = ''): Joker {
  return { id: `joker${idSuffix}`, suit: 'joker', rank: null, faceUp: true }
}

const P1_HAND = [card(3, 'clubs', '-p1a'), card(4, 'clubs', '-p1b')]
const P2_HAND = [card(5, 'hearts', '-p2a'), card(6, 'hearts', '-p2b')]

function makeState(overrides: Partial<RatSlapState> = {}): RatSlapState {
  return {
    rules: DEFAULT_RULES,
    hands: [P1_HAND, P2_HAND],
    pile: [],
    burned: [],
    turn: 1,
    challenge: null,
    lastPlayer: null,
    pileWinner: null,
    pileWonBySlap: false,
    winner: null,
    ...overrides
  }
}

const NO_SLAPS: RatSlapRules = { doubles: false, sandwiches: false, jokers: true }

describe('createInitialState', () => {
  it('deals two 27-card hands with the jokers, an empty pile, player 1 to start, nothing won', () => {
    const state = createInitialState(123, DEFAULT_RULES)
    expect(state.hands[0]).toHaveLength(27)
    expect(state.hands[1]).toHaveLength(27)
    expect(state.pile).toEqual([])
    expect(state.burned).toEqual([])
    expect(state.turn).toBe(1)
    expect(state.challenge).toBeNull()
    expect(state.pileWinner).toBeNull()
    expect(state.winner).toBeNull()
  })

  it('deals two 26-card hands without the jokers', () => {
    const state = createInitialState(123, { ...DEFAULT_RULES, jokers: false })
    expect(state.hands[0]).toHaveLength(26)
    expect(state.hands[1]).toHaveLength(26)
  })

  it('starts with the player it is told to (the loser of the last match)', () => {
    expect(createInitialState(9, DEFAULT_RULES, 2).turn).toBe(2)
  })

  it('is deterministic for a given seed', () => {
    const a = createInitialState(55, DEFAULT_RULES)
    const b = createInitialState(55, DEFAULT_RULES)
    expect(a.hands[0].map((c) => c.id)).toEqual(b.hands[0].map((c) => c.id))
    expect(a.hands[1].map((c) => c.id)).toEqual(b.hands[1].map((c) => c.id))
  })
})

describe('isPlayable', () => {
  it('is true only for the turn player when there is no challenge', () => {
    const state = makeState({ turn: 1 })
    expect(isPlayable(state, 1)).toBe(true)
    expect(isPlayable(state, 2)).toBe(false)
  })

  it('is true only for the defender while a challenge is open', () => {
    const state = makeState({ turn: 2, challenge: { triggerCard: card(11, 'spades'), requiredChances: 1, chancesUsed: 0, attacker: 1, defender: 2 } })
    expect(isPlayable(state, 2)).toBe(true)
    expect(isPlayable(state, 1)).toBe(false)
  })

  it('is false for both players while a won pile waits to be collected', () => {
    const state = makeState({ pileWinner: 1 })
    expect(isPlayable(state, 1)).toBe(false)
    expect(isPlayable(state, 2)).toBe(false)
    expect(toPlay(state)).toBeNull()
  })

  it('is false for both players once the match is over', () => {
    const state = makeState({ winner: 2 })
    expect(isPlayable(state, 1)).toBe(false)
    expect(toPlay(state)).toBeNull()
  })
})

describe('playCard', () => {
  it('turns the played card face up on top of the pile and passes the turn', () => {
    const played = card(7, 'hearts', '-played')
    const result = playCard(makeState({ hands: [[...P1_HAND, { ...played, faceUp: false }], P2_HAND] }), 1)

    expect(result?.pile).toEqual([played])
    expect(result?.hands[0]).toEqual(P1_HAND)
    expect(result?.turn).toBe(2)
    expect(result?.lastPlayer).toBe(1)
  })

  it('returns null when it is not the player’s turn, the pile is waiting, or the match is over', () => {
    expect(playCard(makeState({ turn: 1 }), 2)).toBeNull()
    expect(playCard(makeState({ pileWinner: 1 }), 1)).toBeNull()
    expect(playCard(makeState({ winner: 1 }), 1)).toBeNull()
  })
})

describe('playCard - opening a challenge', () => {
  it.each([
    [11, 'Jack', 1],
    [12, 'Queen', 2],
    [13, 'King', 3],
    [1, 'Ace', 4]
  ] as const)('a %s (%s) gives the other player %i tries', (rank, _label, requiredChances) => {
    const trigger = card(rank, 'spades', '-trigger')
    const result = playCard(makeState({ turn: 1, hands: [[...P1_HAND, trigger], P2_HAND] }), 1)

    expect(result?.challenge).toEqual({ triggerCard: trigger, requiredChances, chancesUsed: 0, attacker: 1, defender: 2 })
    expect(result?.pile).toEqual([trigger])
    expect(result && toPlay(result)).toBe(2)
  })
})

describe('playCard - answering a challenge', () => {
  it('a defender’s face card turns the challenge round, with fresh tries', () => {
    const answer = card(12, 'hearts', '-answer')
    const trigger = card(11, 'spades', '-trigger')
    const result = playCard(makeState({ hands: [P1_HAND, [...P2_HAND, answer]], pile: [trigger], challenge: { triggerCard: trigger, requiredChances: 1, chancesUsed: 0, attacker: 1, defender: 2 } }), 2)

    expect(result?.challenge).toEqual({ triggerCard: answer, requiredChances: 2, chancesUsed: 0, attacker: 2, defender: 1 })
    expect(result && toPlay(result)).toBe(1)
  })

  it('the attacker wins the pile once the defender runs out of tries, and nothing is played until it is collected', () => {
    const trigger = card(11, 'spades', '-trigger')
    const plain = card(5, 'diamonds', '-plain')
    const result = playCard(makeState({ hands: [P1_HAND, [...P2_HAND, plain]], pile: [trigger], challenge: { triggerCard: trigger, requiredChances: 1, chancesUsed: 0, attacker: 1, defender: 2 } }), 2)

    expect(result?.challenge).toBeNull()
    expect(result?.pileWinner).toBe(1)
    expect(result?.pileWonBySlap).toBe(false)
    expect(result && toPlay(result)).toBeNull()
  })

  it('the defender keeps playing while tries remain', () => {
    const trigger = card(1, 'spades', '-trigger')
    const result = playCard(makeState({ pile: [trigger], challenge: { triggerCard: trigger, requiredChances: 4, chancesUsed: 0, attacker: 1, defender: 2 } }), 2)

    expect(result?.challenge?.chancesUsed).toBe(1)
    expect(result?.pileWinner).toBeNull()
    expect(result && isPlayable(result, 2)).toBe(true)
    expect(result && isPlayable(result, 1)).toBe(false)
  })
})

describe('playCard - a joker', () => {
  it.each([0, 2, 3])('cancels a challenge with %i tries used: no winner, and the turn passes', (chancesUsed) => {
    const trigger = card(1, 'spades', '-trigger')
    const jokerCard = joker('-j')
    const result = playCard(makeState({ hands: [P1_HAND, [...P2_HAND, jokerCard]], pile: [trigger], challenge: { triggerCard: trigger, requiredChances: 4, chancesUsed, attacker: 1, defender: 2 } }), 2)

    expect(result?.challenge).toBeNull()
    expect(result?.pileWinner).toBeNull()
    expect(result?.turn).toBe(1)
    expect(result?.pile).toEqual([trigger, jokerCard])
  })

  it('is an ordinary card with no challenge open', () => {
    const jokerCard = joker('-j')
    const result = playCard(makeState({ turn: 1, hands: [[...P1_HAND, jokerCard], P2_HAND] }), 1)

    expect(result?.challenge).toBeNull()
    expect(result?.turn).toBe(2)
  })
})

describe('slapPattern and isSlappable', () => {
  it('a double, only while doubles are on', () => {
    const pile = [card(2, 'clubs'), card(7, 'hearts'), card(7, 'diamonds')]
    expect(slapPattern(makeState({ pile }))).toBe('double')
    expect(isSlappable(makeState({ pile, rules: { ...DEFAULT_RULES, doubles: false } }))).toBe(false)
  })

  it('a sandwich, only while sandwiches are on', () => {
    const pile = [card(2, 'clubs'), card(9, 'hearts'), card(3, 'diamonds'), card(9, 'spades')]
    expect(slapPattern(makeState({ pile }))).toBe('sandwich')
    expect(isSlappable(makeState({ pile, rules: { ...DEFAULT_RULES, sandwiches: false } }))).toBe(false)
  })

  it('two jokers make a double, and joker, card, joker a sandwich', () => {
    expect(slapPattern(makeState({ pile: [card(2), joker('-a'), joker('-b')] }))).toBe('double')
    expect(slapPattern(makeState({ pile: [joker('-a'), card(9, 'hearts'), joker('-b')] }))).toBe('sandwich')
  })

  it('never counts a burned card: one played card on burned cards is not a double', () => {
    const state = makeState({ burned: [{ ...card(7, 'clubs', '-burned'), faceUp: false }], pile: [card(7, 'hearts')] })
    expect(isSlappable(state)).toBe(false)
  })

  it('a face-card win waiting to be collected can still be slapped, a slapped pile cannot', () => {
    const pile = [card(11, 'spades'), card(7, 'hearts'), card(7, 'diamonds')]
    expect(isSlappable(makeState({ pile, pileWinner: 1 }))).toBe(true)
    expect(isSlappable(makeState({ pile, pileWinner: 1, pileWonBySlap: true }))).toBe(false)
  })
})

describe('slap - a good slap', () => {
  it('wins the pile even mid-challenge, burning nothing', () => {
    const trigger = card(11, 'spades', '-trigger')
    const pile = [trigger, card(9, 'hearts'), card(9, 'diamonds')]
    const state = makeState({ pile, challenge: { triggerCard: trigger, requiredChances: 1, chancesUsed: 0, attacker: 1, defender: 2 } })

    const result = slap(state, 2)

    expect(result?.pileWinner).toBe(2)
    expect(result?.pileWonBySlap).toBe(true)
    expect(result?.challenge).toBeNull()
    expect(result?.pile).toBe(pile)
    expect(result?.hands).toBe(state.hands)
  })

  it('takes a face-card win away while it waits to be collected', () => {
    const pile = [card(11, 'spades'), card(7, 'hearts'), card(7, 'diamonds')]
    const result = slap(makeState({ pile, pileWinner: 1 }), 2)
    expect(result?.pileWinner).toBe(2)
    expect(result?.pileWonBySlap).toBe(true)
  })

  it('a second slap on a slapped pile is too late: nothing happens, nothing burns', () => {
    const pile = [card(7, 'hearts'), card(7, 'diamonds')]
    expect(slap(makeState({ pile, pileWinner: 1, pileWonBySlap: true }), 2)).toBeNull()
  })
})

describe('slap - a wrong slap', () => {
  it('burns the slapper’s top card face down under the pile, leaving the turn and the challenge alone', () => {
    const pile = [card(2, 'clubs'), card(9, 'hearts')]
    const burning = card(5, 'diamonds', '-burn')
    const remaining = card(6, 'diamonds', '-remain')
    const result = slap(makeState({ pile, turn: 1, hands: [P1_HAND, [remaining, burning]] }), 2)

    expect(result?.pileWinner).toBeNull()
    expect(result?.turn).toBe(1)
    expect(result?.pile).toBe(pile)
    expect(result?.burned).toEqual([{ ...burning, faceUp: false }])
    expect(result?.hands[1]).toEqual([remaining])
  })

  it('puts each new burned card under the ones already there', () => {
    const older = { ...card(8, 'spades', '-older'), faceUp: false }
    const result = slap(makeState({ pile: [card(2), card(9)], burned: [older] }), 1)
    expect(result?.burned).toEqual([{ ...P1_HAND[1], faceUp: false }, older])
  })

  it('burning a defender’s last card means they can’t answer: the attacker wins the pile', () => {
    const trigger = card(12, 'spades', '-trigger')
    const last = card(5, 'diamonds', '-last')
    const result = slap(makeState({ pile: [card(2), trigger], hands: [P1_HAND, [last]], challenge: { triggerCard: trigger, requiredChances: 2, chancesUsed: 0, attacker: 1, defender: 2 } }), 2)
    expect(result?.pileWinner).toBe(1)
  })

  it('with no card to burn, loses the match', () => {
    expect(slap(makeState({ pile: [card(2), card(9)], hands: [P1_HAND, []], turn: 1 }), 2)?.winner).toBe(1)
  })

  it('is too late once the match is over', () => {
    expect(slap(makeState({ winner: 1 }), 2)).toBeNull()
  })
})

describe('collectPile', () => {
  it('is only for the pile’s winner', () => {
    expect(collectPile(makeState({ pileWinner: 1 }), 2)).toBeNull()
    expect(collectPile(makeState({ pileWinner: null }), 1)).toBeNull()
  })

  it('puts the pile, burned cards included, turned over and face down, under the winner’s deck; the winner plays next', () => {
    const burnedCard = { ...card(4, 'spades', '-b'), faceUp: false }
    const pile = [card(2, 'clubs'), card(9, 'hearts'), card(7, 'diamonds')]
    const existing = card(3, 'spades', '-existing')
    const result = collectPile(makeState({ pile, burned: [burnedCard], pileWinner: 2, turn: 1, hands: [P1_HAND, [existing]] }), 2)

    expect(result?.pile).toEqual([])
    expect(result?.burned).toEqual([])
    expect(result?.pileWinner).toBeNull()
    expect(result?.turn).toBe(2)
    // The winner's own card stays on top (the end); the won cards are under it, the pile's top card
    // at the very bottom, as a pile turned over and slid under the deck lands.
    expect(result?.hands[1].map((c) => c.id)).toEqual(['diamonds-7', 'hearts-9', 'clubs-2', 'spades-4-b', 'spades-3-existing'])
    expect(result?.hands[1].slice(0, 4).every((c) => !c.faceUp)).toBe(true)
  })
})

describe('out of cards: slap back in', () => {
  it('a player out of cards is skipped: the other plays every turn', () => {
    const lastCard = card(7, 'clubs', '-last')
    const result = playCard(makeState({ turn: 1, hands: [[lastCard], P2_HAND] }), 1)
    expect(result && isOut(result, 1)).toBe(true)
    expect(result?.turn).toBe(2)
    const next = result && playCard(result, 2)
    expect(next?.turn).toBe(2)
  })

  it('a face card against a player out of cards wins the pile at once', () => {
    const result = playCard(makeState({ turn: 2, hands: [[], [...P2_HAND, card(11, 'spades')]], pile: [card(3)] }), 2)
    expect(result?.pileWinner).toBe(2)
  })

  it('a defender who plays their last card with tries left can’t go on: the attacker wins the pile', () => {
    const trigger = card(13, 'spades', '-trigger')
    const result = playCard(makeState({ hands: [P1_HAND, [card(5, 'diamonds', '-last')]], pile: [trigger], challenge: { triggerCard: trigger, requiredChances: 3, chancesUsed: 0, attacker: 1, defender: 2 } }), 2)
    expect(result?.pileWinner).toBe(1)
    expect(result?.winner).toBeNull()
  })

  it('a good slap gets a player out of cards back in', () => {
    const pile = [card(7, 'hearts'), card(7, 'diamonds')]
    const won = slap(makeState({ pile, hands: [[], P2_HAND], turn: 2 }), 1)
    const result = won && collectPile(won, 1)
    expect(result?.hands[0]).toHaveLength(2)
    expect(result?.winner).toBeNull()
    expect(result?.turn).toBe(1)
  })

  it('the other player collecting a pile while you are out wins them the match', () => {
    const pile = [card(11, 'spades'), card(5, 'hearts')]
    const result = collectPile(makeState({ pile, pileWinner: 2, hands: [[], P2_HAND] }), 2)
    expect(result?.winner).toBe(2)
    expect(result && toPlay(result)).toBeNull()
  })

  it('a face-card win against a player who is out can still be slapped back, until it is collected', () => {
    const state = makeState({ turn: 2, hands: [[], [...P2_HAND, card(11, 'spades')]], pile: [card(11, 'hearts')] })
    const won = playCard(state, 2)
    expect(won?.pileWinner).toBe(2)
    const slapped = won && slap(won, 1)
    expect(slapped?.pileWinner).toBe(1)
  })

  it('once neither player has a card, the pile goes to whoever played its top card', () => {
    const result = playCard(makeState({ turn: 1, hands: [[card(4, 'clubs', '-last')], []], pile: [card(9)] }), 1)
    expect(result?.pileWinner).toBe(1)
  })
})

describe('the deck stays whole', () => {
  it('through a seeded match of plays, slaps and collections', () => {
    let state = createInitialState(2026, DEFAULT_RULES)
    const total = cardCount(state)
    for (let step = 0; step < 4000 && state.winner === null; step++) {
      const next = step % 7 === 3 ? slap(state, ((step % 2) + 1) as 1 | 2) : state.pileWinner !== null ? collectPile(state, state.pileWinner) : playCard(state, toPlay(state) ?? 1)
      if (next) state = next
      expect(cardCount(state)).toBe(total)
    }
  })

  it('with no slaps at all it is the same game of challenges, still conserving every card', () => {
    let state = createInitialState(7, NO_SLAPS)
    const total = cardCount(state)
    for (let step = 0; step < 2000 && state.winner === null; step++) {
      const next = state.pileWinner !== null ? collectPile(state, state.pileWinner) : playCard(state, toPlay(state) ?? 1)
      if (!next) break
      state = next
    }
    expect(cardCount(state)).toBe(total)
  })
})
