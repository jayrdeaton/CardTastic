import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32 } from '@/engine/rng'
import { cpuGoesOut, cpuOutCard, cpuTakesDiscard, cpuThrow } from '@/games/fourcrowns/engine/cpu'
import { canGoOut, canThrow, cardCount, createCrownsMatch, crownsDeck, discardTop, drawStock, goOut, handSizeFor, nextRound, pointsAfterThrow, takeDiscard, throwCard, toMove, wildRankFor } from '@/games/fourcrowns/engine/rules'
import { type CrownsRules, type CrownsState, DEFAULT_CROWNS_RULES, ROUNDS } from '@/games/fourcrowns/engine/types'
import { type CpuLevel } from '@/games/table/cpuLevel'

// Four Crowns' rules: eleven rounds of 3 to 13 cards with that rank wild, draw and throw, going out, everyone else's
// last turn, scoring, and CPU matches for two to four players that all end with every card accounted for.

const c = (rank: number, suit: Suit, deck = 0): Card => ({ id: `${suit}-${rank}-${deck}`, suit, rank: rank as Rank, faceUp: true })

/** A round-1 state (3s wild) with these hands, the rest of the stock as dealt, and this card on the discard. */
function withHands(players: number, hands: Card[][], top: Card, turn = 0): CrownsState {
  const base = createCrownsMatch(1, players)
  const used = new Set([...hands.flat(), top].map((card) => card.id))
  const stock = [...base.stock, ...base.hands.flat(), ...base.discard].filter((card) => !used.has(card.id)).map((card) => ({ ...card, faceUp: false }))
  return { ...base, hands, stock, discard: [top], turn, dealer: (turn + players - 1) % players }
}

describe('a match', () => {
  it('deals 3 cards each in the first round with 3s wild, and one more card each round to 13 with Kings wild', () => {
    expect([1, 2, 9, 10, 11].map(handSizeFor)).toEqual([3, 4, 11, 12, 13])
    expect([1, 2, 9, 10, 11].map(wildRankFor)).toEqual([3, 4, 11, 12, 13])
    expect(ROUNDS).toBe(11)
    const state = createCrownsMatch(5, 3)
    expect(state.hands.map((hand) => hand.length)).toEqual([3, 3, 3])
    expect(state.discard).toHaveLength(1)
    expect(cardCount(state)).toBe(104)
    expect(state.phase).toBe('draw')
    expect(toMove(state)).toBe(0)
  })

  it('uses both decks with no jokers: each card twice', () => {
    const state = createCrownsMatch(5, 4)
    const all = [...state.hands.flat(), ...state.stock, ...state.discard]
    const counts = new Map<string, number>()
    for (const card of all) counts.set(`${card.suit}-${card.rank}`, (counts.get(`${card.suit}-${card.rank}`) ?? 0) + 1)
    expect(counts.size).toBe(52)
    expect([...counts.values()].every((n) => n === 2)).toBe(true)
  })

  it('a turn is a draw, from the stock or the discard, then a throw; then the next player', () => {
    let state = createCrownsMatch(9, 3)
    state = drawStock(state, 0)!
    expect(state.hands[0]).toHaveLength(4)
    expect(state.phase).toBe('discard')
    expect(drawStock(state, 0)).toBeNull()
    state = throwCard(state, 0, state.hands[0][0].id)!
    expect(toMove(state)).toBe(1)
    const top = discardTop(state)!
    state = takeDiscard(state, 1)!
    expect(state.hands[1].some((card) => card.id === top.id)).toBe(true)
    // The card just taken can't be thrown straight back.
    expect(canThrow(state, 1, top.id)).toBe(false)
    expect(throwCard(state, 1, top.id)).toBeNull()
    state = throwCard(state, 1, state.hands[1].find((card) => card.id !== top.id)!.id)!
    expect(toMove(state)).toBe(2)
    expect(state.turns.map((turn) => [turn.player, turn.took])).toEqual([
      [0, 'stock'],
      [1, 'discard']
    ])
  })

  it('a player who melds every card but the one they throw goes out; the others each have one last turn, and the round is scored', () => {
    // 3s wild. Player 0 holds 7-8 of hearts and a wild, draws, and goes out throwing the King.
    let state = withHands(
      3,
      [
        [c(7, 'hearts'), c(8, 'hearts'), c(3, 'clubs')],
        [c(5, 'spades'), c(5, 'diamonds'), c(12, 'clubs')],
        [c(1, 'clubs'), c(9, 'diamonds'), c(10, 'spades')]
      ],
      c(13, 'spades')
    )
    state = takeDiscard(state, 0)!
    expect(canGoOut(state, 0, 'hearts-7-0')).toBe(false)
    expect(canGoOut(state, 0, 'spades-13-0')).toBe(false) // the card just taken
    state = { ...state, taken: null }
    expect(pointsAfterThrow(state, 0, 'spades-13-0')).toBe(0)
    state = goOut(state, 0, 'spades-13-0')!
    expect(state.out).toBe(0)
    expect(state.lastTurns).toEqual([1, 2])
    expect(toMove(state)).toBe(1)
    // Nobody else can go out now; their throws just end their last turns.
    state = drawStock(state, 1)!
    expect(canGoOut(state, 1, state.hands[1][0].id)).toBe(false)
    state = throwCard(state, 1, 'clubs-12-0')!
    expect(toMove(state)).toBe(2)
    state = drawStock(state, 2)!
    const last = state.hands[2].find((card) => card.id === 'spades-10-0')!
    state = throwCard(state, 2, last.id)!
    expect(state.phase).toBe('roundOver')
    expect(state.result!.out).toBe(0)
    expect(state.result!.points[0]).toBe(0)
    expect(state.totals).toEqual(state.result!.points)
    expect(state.history).toEqual([state.result!.points])
  })

  it('a hand the last turn melds completely scores 0 too', () => {
    let state = withHands(
      2,
      [
        [c(7, 'hearts'), c(8, 'hearts'), c(3, 'clubs')],
        [c(5, 'spades'), c(5, 'diamonds'), c(12, 'clubs')]
      ],
      c(13, 'spades')
    )
    // Player 0's 7-8 of hearts and a wild are a run already: they go out throwing whatever they draw.
    state = drawStock(state, 0)!
    state = goOut(state, 0, state.hands[0][3].id)!
    // Player 1 takes a 5 from the discard (put there for the test) and throws the Queen: three 5s.
    state = { ...state, discard: [...state.discard, c(5, 'hearts')] }
    state = takeDiscard(state, 1)!
    state = throwCard(state, 1, 'clubs-12-0')!
    expect(state.phase).toBe('roundOver')
    expect(state.result!.points).toEqual([0, 0])
  })

  it('the next round deals one more card each, the dealer moves on a seat, and the player after them plays first', () => {
    let state = createCrownsMatch(3, 3)
    expect(state.dealer).toBe(2)
    state = { ...state, phase: 'roundOver' }
    state = nextRound(state)!
    expect(state.round).toBe(2)
    expect(state.dealer).toBe(0)
    expect(toMove(state)).toBe(1)
    expect(state.hands.map((hand) => hand.length)).toEqual([4, 4, 4])
    expect(state.turns).toEqual([])
  })

  it('an empty stock is made again from the discard, all but its top card', () => {
    let state = createCrownsMatch(4, 2)
    const discard = [...state.stock, ...state.discard].map((card) => ({ ...card, faceUp: true }))
    state = { ...state, stock: [], discard }
    const top = discardTop(state)!
    state = drawStock(state, 0)!
    expect(state.discard).toEqual([top])
    expect(state.stock).toHaveLength(discard.length - 2)
    expect(state.reshuffles).toBe(1)
    expect(cardCount(state)).toBe(104)
  })

  it('after the eleventh round the lowest total wins, and a tie shares it', () => {
    let state = createCrownsMatch(2, 3)
    state = { ...state, round: ROUNDS, totals: [40, 30, 30] }
    state = withLastRound(state)
    expect(state.phase).toBe('matchOver')
    expect(state.winners).toEqual(state.totals.flatMap((total, i) => (total === Math.min(...state.totals) ? [i] : [])))
  })
})

/** Plays a round out with every player drawing and throwing their highest card until someone can go out. */
function withLastRound(start: CrownsState): CrownsState {
  let state = start
  for (let step = 0; step < 400 && (state.phase === 'draw' || state.phase === 'discard'); step++) {
    const player = state.turn
    if (state.phase === 'draw') state = drawStock(state, player)!
    else {
      const out = cpuOutCard(state, player)
      state = out
        ? goOut(state, player, out)!
        : throwCard(
            state,
            player,
            cpuThrow(state, player, 'hard', () => 0.5)
          )!
    }
  }
  return state
}

describe('the CPU', () => {
  it('goes out when it can, with the card that lets it', () => {
    let state = withHands(
      2,
      [
        [c(7, 'hearts'), c(8, 'hearts'), c(3, 'clubs')],
        [c(5, 'spades'), c(5, 'diamonds'), c(12, 'clubs')]
      ],
      c(13, 'spades')
    )
    state = drawStock(state, 0)!
    const card = cpuOutCard(state, 0)
    if (card) {
      expect(cpuGoesOut(state, 0, card)).toBe(true)
      expect(pointsAfterThrow(state, 0, card)).toBe(0)
    }
  })

  it('takes a wild from the discard, and a card that melds', () => {
    const state = withHands(
      2,
      [
        [c(9, 'hearts'), c(9, 'clubs'), c(1, 'spades')],
        [c(5, 'spades'), c(6, 'diamonds'), c(12, 'clubs')]
      ],
      c(3, 'diamonds')
    )
    expect(cpuTakesDiscard(state, 0, 'hard', () => 0.5)).toBe(true)
    expect(cpuTakesDiscard({ ...state, discard: [c(9, 'spades')] }, 0, 'hard', () => 0.5)).toBe(true)
    expect(cpuTakesDiscard({ ...state, discard: [c(13, 'diamonds')] }, 0, 'hard', () => 0.5)).toBe(false)
  })

  it('throws the card whose loss leaves the fewest points, never one it just took', () => {
    let state = withHands(
      2,
      [
        [c(9, 'hearts'), c(9, 'clubs'), c(1, 'spades')],
        [c(5, 'spades'), c(6, 'diamonds'), c(12, 'clubs')]
      ],
      c(9, 'spades')
    )
    state = takeDiscard(state, 0)!
    expect(cpuThrow(state, 0, 'hard', () => 0.5)).toBe('spades-1-0')
  })

  it('keeps its wilds until its last turn, and then throws a loose one for its 20 points', () => {
    // 3s wild: a King, a Queen, a 9 and a lone wild, no meld anywhere.
    let state = withHands(
      2,
      [
        [c(13, 'spades'), c(12, 'diamonds'), c(3, 'clubs')],
        [c(5, 'spades'), c(6, 'diamonds'), c(12, 'clubs')]
      ],
      c(9, 'hearts')
    )
    state = takeDiscard(state, 0)!
    for (const level of ['easy', 'medium', 'hard'] as const) for (const roll of [0, 0.5, 0.99]) expect(cpuThrow(state, 0, level, () => roll)).not.toBe('clubs-3-0')
    // On the last turn it's just points: the loose wild costs most.
    expect(cpuThrow({ ...state, out: 1, lastTurns: [0] }, 0, 'hard', () => 0.5)).toBe('clubs-3-0')
  })

  it.each([2, 3, 4])('CPU matches for %i players all end, every card accounted for', (players) => {
    for (let game = 0; game < 4; game++) {
      const result = playMatch(game * 31 + players, Array(players).fill('medium'))
      expect(result.phase).toBe('matchOver')
      expect(result.history).toHaveLength(ROUNDS)
      expect(result.winners!.length).toBeGreaterThan(0)
    }
  })

  it.each([
    { deck: 'jokers', faces: 'ten', lastTurns: 'everyone' },
    { deck: 'short', faces: 'ranked', lastTurns: 'none' }
  ] as CrownsRules[])('CPU matches under other rules all end, every card accounted for: %o', (rules) => {
    for (let game = 0; game < 3; game++) {
      const result = playMatch(500 + game, ['medium', 'hard', 'easy'], rules)
      expect(result.phase).toBe('matchOver')
      expect(result.history).toHaveLength(ROUNDS)
    }
  })

  it('Hard beats Easy far more often than not', () => {
    let hardWins = 0
    const games = 40
    for (let game = 0; game < games; game++) {
      const levels: CpuLevel[] = game % 2 === 0 ? ['hard', 'easy'] : ['easy', 'hard']
      const result = playMatch(1000 + game, levels)
      const hard = levels.indexOf('hard')
      if (result.totals[hard] < result.totals[1 - hard]) hardWins++
    }
    expect(hardWins).toBeGreaterThanOrEqual(games * 0.6)
  })
})

/** A whole match of CPUs at these levels, checking every card is in play after every move. */
function playMatch(seed: number, levels: CpuLevel[], rules: CrownsRules = DEFAULT_CROWNS_RULES): CrownsState {
  const rng = mulberry32(seed)
  const deckSize = crownsDeck(rules).length
  let state = createCrownsMatch(seed, levels.length, 0, rules)
  for (let step = 0; step < 20000 && state.phase !== 'matchOver'; step++) {
    if (state.phase === 'roundOver') {
      state = nextRound(state)!
      continue
    }
    const player = state.turn
    const level = levels[player]
    if (state.phase === 'draw') state = (cpuTakesDiscard(state, player, level, rng) ? takeDiscard(state, player) : drawStock(state, player))!
    else {
      const out = cpuOutCard(state, player)
      state = (out ? goOut(state, player, out) : throwCard(state, player, cpuThrow(state, player, level, rng)))!
    }
    expect(cardCount(state)).toBe(deckSize)
  }
  return state
}

describe('the rule choices', () => {
  it('plays with two decks, or with four jokers, or with the jokers and no Aces or 2s', () => {
    expect(crownsDeck(DEFAULT_CROWNS_RULES)).toHaveLength(104)
    const jokers = crownsDeck({ ...DEFAULT_CROWNS_RULES, deck: 'jokers' })
    expect(jokers).toHaveLength(108)
    expect(jokers.filter((card) => card.rank === null).map((card) => card.id)).toEqual(['joker-0-0', 'joker-0-1', 'joker-1-0', 'joker-1-1'])
    const short = crownsDeck({ ...DEFAULT_CROWNS_RULES, deck: 'short' })
    expect(short).toHaveLength(92)
    expect(short.every((card) => card.rank === null || card.rank >= 3)).toBe(true)
    expect(cardCount(createCrownsMatch(3, 4, 0, { ...DEFAULT_CROWNS_RULES, deck: 'short' }))).toBe(92)
  })

  it('ends the round at once when someone goes out, with no last turns', () => {
    let state = withHands(
      3,
      [
        [c(7, 'hearts'), c(8, 'hearts'), c(3, 'clubs')],
        [c(5, 'spades'), c(5, 'diamonds'), c(12, 'clubs')],
        [c(1, 'clubs'), c(9, 'diamonds'), c(10, 'spades')]
      ],
      c(13, 'spades')
    )
    state = { ...state, rules: { ...state.rules, lastTurns: 'none' } }
    state = drawStock(state, 0)!
    state = goOut(state, 0, state.hands[0].find((card) => card.rank === 13 || !['hearts-7-0', 'hearts-8-0', 'clubs-3-0'].includes(card.id))!.id)!
    expect(state.phase).toBe('roundOver')
    expect(state.result!.out).toBe(0)
    expect(state.result!.points[1]).toBe(5 + 5 + 12)
  })

  it('counts face cards 10 each when the rules say so', () => {
    const state = withHands(
      2,
      [
        [c(13, 'spades'), c(12, 'clubs'), c(5, 'hearts')],
        [c(11, 'diamonds'), c(9, 'clubs'), c(4, 'hearts')]
      ],
      c(2, 'spades')
    )
    const tens = { ...state, rules: { ...state.rules, faces: 'ten' as const } }
    expect(pointsAfterThrow(tens, 0, 'hearts-5-0')).toBe(20)
    expect(pointsAfterThrow(state, 0, 'hearts-5-0')).toBe(25)
  })
})
