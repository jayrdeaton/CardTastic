import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32 } from '@/engine/rng'
import { cpuMove, cpuSuit } from '@/games/crazyeights/engine/cpu'
import { canDraw, canPass, canPlay, cardCount, createEightsMatch, discardTop, draw, fits, handSizeFor, nameSuit, pass, play, playableCards, rematch, toMove } from '@/games/crazyeights/engine/rules'
import { DEFAULT_EIGHTS_RULES, type EightsRules, type EightsState } from '@/games/crazyeights/engine/types'
import { type CpuLevel } from '@/games/table/cpuLevel'

// Crazy Eights' rules: the deal and hand sizes, what fits, the wild 8s, each draw rule, the 2s and the action cards,
// going out, a game nobody can finish, and CPU games for two to four players that all end with every card accounted for.

const c = (rank: number, suit: Suit): Card => ({ id: `${suit}-${rank}-0`, suit, rank: rank as Rank, faceUp: true })

/** A game with these hands, this card on the discard and the rest of the deck in the stock (in deck order, top last). */
function withHands(hands: Card[][], top: Card, rules: Partial<EightsRules> = {}, turn = 0): EightsState {
  const base = createEightsMatch(1, hands.length, { ...DEFAULT_EIGHTS_RULES, ...rules })
  const used = new Set([...hands.flat(), top].map((card) => card.id))
  const stock = [...base.stock, ...base.hands.flat(), ...base.discard].filter((card) => !used.has(card.id)).map((card) => ({ ...card, faceUp: false }))
  return { ...base, hands, stock, discard: [top], suit: top.suit, turn }
}

/** The same, with the stock's top cards (top last) set. */
function withStock(state: EightsState, top: Card[]): EightsState {
  const ids = new Set(top.map((card) => card.id))
  return { ...state, stock: [...state.stock.filter((card) => !ids.has(card.id)), ...top.map((card) => ({ ...card, faceUp: false }))] }
}

describe('the deal', () => {
  it('deals 7 each to two players and 5 each to three or four, or always 7 or always 5', () => {
    expect([2, 3, 4].map((players) => handSizeFor(DEFAULT_EIGHTS_RULES, players))).toEqual([7, 5, 5])
    expect([2, 3, 4].map((players) => handSizeFor({ ...DEFAULT_EIGHTS_RULES, hand: 'seven' }, players))).toEqual([7, 7, 7])
    expect([2, 3, 4].map((players) => handSizeFor({ ...DEFAULT_EIGHTS_RULES, hand: 'five' }, players))).toEqual([5, 5, 5])
    const state = createEightsMatch(3, 3, DEFAULT_EIGHTS_RULES, 1)
    expect(state.hands.map((hand) => hand.length)).toEqual([5, 5, 5])
    expect(cardCount(state)).toBe(52)
    expect(toMove(state)).toBe(1)
    expect(state.suit).toBe(discardTop(state).suit)
  })

  it('never starts the discard with an 8', () => {
    for (let seed = 0; seed < 300; seed++) expect(createEightsMatch(seed, 2, DEFAULT_EIGHTS_RULES).discard[0].rank).not.toBe(8)
  })

  it('starts a rematch with the next player', () => {
    const state = createEightsMatch(3, 3, DEFAULT_EIGHTS_RULES, 2)
    expect(rematch(state, 9).turn).toBe(0)
    expect(rematch(state, 9).rules).toBe(state.rules)
  })
})

describe('a turn', () => {
  it('takes a card of the suit to follow, of the top card’s rank, or an 8', () => {
    const state = withHands([[c(5, 'hearts'), c(9, 'clubs'), c(8, 'spades'), c(3, 'diamonds')], [c(2, 'spades')]], c(9, 'hearts'))
    expect(playableCards(state, 0).map((card) => card.id)).toEqual(['hearts-5-0', 'clubs-9-0', 'spades-8-0'])
    expect(canPlay(state, 0, 'diamonds-3-0')).toBe(false)
    expect(canPlay(state, 1, 'spades-2-0')).toBe(false)
    const next = play(state, 0, 'clubs-9-0')!
    expect(next.suit).toBe('clubs')
    expect(next.turn).toBe(1)
    expect(next.turns.at(-1)).toMatchObject({ player: 0, played: { id: 'clubs-9-0' }, facing: 'hearts', drew: 0 })
  })

  it('names a suit after an 8, which only that suit (or another 8) follows', () => {
    const state = withHands(
      [
        [c(8, 'spades'), c(4, 'clubs')],
        [c(5, 'diamonds'), c(9, 'clubs'), c(8, 'hearts')]
      ],
      c(5, 'hearts')
    )
    const waiting = play(state, 0, 'spades-8-0')!
    expect(waiting.phase).toBe('suit')
    expect(waiting.turn).toBe(0)
    expect(play(waiting, 1, 'diamonds-5-0')).toBeNull()
    const named = nameSuit(waiting, 0, 'clubs')!
    expect(named).toMatchObject({ phase: 'play', suit: 'clubs', turn: 1 })
    expect(named.turns.at(-1)).toMatchObject({ played: { id: 'spades-8-0' }, named: 'clubs', facing: 'hearts' })
    // The 5 matches the 5 under the 8 in rank, but not the 8: only clubs or an 8 now.
    expect(fits(named, c(5, 'diamonds'))).toBe(false)
    expect(playableCards(named, 1).map((card) => card.id)).toEqual(['clubs-9-0', 'hearts-8-0'])
  })

  it('wins on the last card, an 8 included, with no suit to name', () => {
    const state = withHands([[c(8, 'spades')], [c(5, 'diamonds')]], c(5, 'hearts'))
    const over = play(state, 0, 'spades-8-0')!
    expect(over.phase).toBe('over')
    expect(over.winners).toEqual([0])
    expect(over.turns.at(-1)).toMatchObject({ out: true })
    expect(toMove(over)).toBeNull()
  })

  it('draws only while nothing fits', () => {
    const state = withHands([[c(5, 'hearts')], [c(2, 'spades')]], c(9, 'hearts'))
    expect(canDraw(state, 0)).toBe(false)
    expect(draw(state, 0)).toBeNull()
  })
})

describe('the draw rules', () => {
  const stuck = (rules: Partial<EightsRules>) => withStock(withHands([[c(3, 'clubs'), c(4, 'clubs')], [c(2, 'spades')]], c(9, 'hearts'), rules), [c(10, 'hearts'), c(6, 'spades'), c(7, 'spades'), c(5, 'diamonds')])

  it('draws until a card fits, then plays it', () => {
    let state = stuck({ draw: 'untilPlayable' })
    for (let i = 0; i < 3; i++) state = draw(state, 0)!
    expect(state.hands[0].map((card) => card.id)).toEqual(['clubs-3-0', 'clubs-4-0', 'diamonds-5-0', 'spades-7-0', 'spades-6-0'])
    expect(canDraw(state, 0)).toBe(true)
    state = draw(state, 0)!
    expect(canDraw(state, 0)).toBe(false)
    expect(canPass(state, 0)).toBe(false)
    const next = play(state, 0, 'hearts-10-0')!
    expect(next.turns.at(-1)).toMatchObject({ drew: 4, played: { id: 'hearts-10-0' } })
  })

  it('draws one, then passes when it doesn’t fit', () => {
    let state = stuck({ draw: 'one' })
    state = draw(state, 0)!
    expect(canDraw(state, 0)).toBe(false)
    expect(canPass(state, 0)).toBe(true)
    const next = pass(state, 0)!
    expect(next.turn).toBe(1)
    expect(next.passes).toBe(0)
    expect(next.turns.at(-1)).toMatchObject({ player: 0, drew: 1, played: null, facing: 'hearts' })
  })

  it('draws up to three', () => {
    let state = stuck({ draw: 'three' })
    for (let i = 0; i < 3; i++) state = draw(state, 0)!
    expect(canDraw(state, 0)).toBe(false)
    expect(canPass(state, 0)).toBe(true)
  })

  it('shuffles the discard but its top card into a new stock when the stock runs out', () => {
    const base = withHands([[c(3, 'clubs')], [c(2, 'spades')]], c(9, 'hearts'), { draw: 'untilPlayable' })
    const state: EightsState = { ...base, stock: [], discard: [c(10, 'diamonds'), c(4, 'hearts'), c(9, 'hearts')] }
    const next = draw(state, 0)!
    expect(next.discard.map((card) => card.id)).toEqual(['hearts-9-0'])
    expect(next.hands[0]).toHaveLength(2)
    expect(next.stock).toHaveLength(1)
    expect(next.reshuffles).toBe(1)
  })

  it('ends the game once everyone has passed with nothing to draw, the fewest cards winning', () => {
    const base = withHands([[c(3, 'clubs')], [c(2, 'spades'), c(4, 'spades')], [c(5, 'clubs')]], c(9, 'hearts'))
    let state: EightsState = { ...base, stock: [] }
    state = pass(state, 0)!
    state = pass(state, 1)!
    expect(state.phase).toBe('play')
    state = pass(state, 2)!
    expect(state.phase).toBe('over')
    expect(state.winners).toEqual([0, 2])
  })
})

describe('the special cards', () => {
  const hands = () => [[c(2, 'hearts'), c(12, 'hearts'), c(1, 'hearts'), c(4, 'clubs')], [c(3, 'spades'), c(3, 'diamonds')], [c(5, 'spades')], [c(6, 'spades')]]

  it('does nothing with only the 8s', () => {
    const state = withHands(hands(), c(9, 'hearts'), { specials: 'eights' })
    expect(play(state, 0, 'hearts-2-0')!.turn).toBe(1)
    expect(play(state, 0, 'hearts-12-0')!.turn).toBe(1)
    expect(play(state, 0, 'hearts-1-0')!.turn).toBe(1)
  })

  it('makes the next player draw two and lose their turn for a 2', () => {
    const state = withStock(withHands(hands(), c(9, 'hearts'), { specials: 'twos' }), [c(10, 'clubs'), c(11, 'clubs')])
    const next = play(state, 0, 'hearts-2-0')!
    expect(next.hands[1].map((card) => card.id)).toEqual(['spades-3-0', 'diamonds-3-0', 'clubs-11-0', 'clubs-10-0'])
    expect(next.turn).toBe(2)
    expect(next.turns.at(-1)).toMatchObject({ player: 1, drew: 2, lost: 'drawTwo' })
    expect(cardCount(next)).toBe(52)
    // A Queen and an Ace are plain cards with only the 2s.
    expect(play(state, 0, 'hearts-12-0')!.turn).toBe(1)
  })

  it('skips the next player for a Queen and turns play the other way for an Ace, with the action cards', () => {
    const state = withHands(hands(), c(9, 'hearts'), { specials: 'action' })
    const skipped = play(state, 0, 'hearts-12-0')!
    expect(skipped.turn).toBe(2)
    expect(skipped.turns.at(-1)).toMatchObject({ player: 1, lost: 'skip' })
    const reversed = play(state, 0, 'hearts-1-0')!
    expect(reversed.direction).toBe(-1)
    expect(reversed.turn).toBe(3)
    expect(reversed.turns.at(-1)).toMatchObject({ player: 0, reversed: true })
    // And back again.
    const again = play({ ...reversed, hands: [reversed.hands[0], reversed.hands[1], reversed.hands[2], [c(1, 'spades'), c(7, 'clubs')]], suit: 'hearts' }, 3, 'spades-1-0')!
    expect(again.direction).toBe(1)
    expect(again.turn).toBe(0)
  })

  it('gives whoever played an Ace another turn with two players', () => {
    const state = withHands([[c(1, 'hearts'), c(4, 'clubs')], [c(3, 'spades')]], c(9, 'hearts'), { specials: 'action' })
    expect(play(state, 0, 'hearts-1-0')!.turn).toBe(0)
  })

  it('does nothing to anyone when the card wins', () => {
    const state = withHands([[c(2, 'hearts')], [c(3, 'spades')]], c(9, 'hearts'), { specials: 'action' })
    const over = play(state, 0, 'hearts-2-0')!
    expect(over.phase).toBe('over')
    expect(over.hands[1]).toHaveLength(1)
  })
})

describe('the CPU', () => {
  it('draws when nothing fits and passes when it can’t', () => {
    const rng = mulberry32(1)
    const state = withHands([[c(3, 'clubs')], [c(2, 'spades')]], c(9, 'hearts'), { draw: 'one' })
    expect(cpuMove(state, 0, 'hard', rng)).toEqual({ kind: 'draw' })
    expect(cpuMove({ ...state, drawn: 1 }, 0, 'hard', rng)).toEqual({ kind: 'pass' })
  })

  it('keeps its 8s while another card fits, from Medium up', () => {
    const state = withHands([[c(8, 'spades'), c(4, 'hearts'), c(6, 'clubs')], [c(2, 'spades')]], c(9, 'hearts'))
    for (const level of ['medium', 'hard'] as const) expect(cpuMove(state, 0, level, () => 0.99)).toEqual({ kind: 'play', cardId: 'hearts-4-0' })
  })

  it('names the suit it holds most of', () => {
    const state = withHands([[c(8, 'spades'), c(4, 'clubs'), c(6, 'clubs'), c(2, 'hearts')], [c(2, 'spades')]], c(9, 'hearts'))
    const waiting = play(state, 0, 'spades-8-0')!
    expect(cpuSuit(waiting, 0, 'medium', () => 0.99)).toBe('clubs')
  })

  it('hits a player about to go out with a 2, at Hard', () => {
    const state = withHands([[c(2, 'hearts'), c(5, 'hearts'), c(6, 'hearts')], [c(3, 'spades')]], c(9, 'hearts'), { specials: 'twos' })
    expect(cpuMove(state, 0, 'hard', () => 0.99)).toEqual({ kind: 'play', cardId: 'hearts-2-0' })
  })

  it('leads a suit the next player drew for, at Hard', () => {
    let state = withHands(
      [
        [c(5, 'hearts'), c(5, 'diamonds'), c(9, 'clubs')],
        [c(3, 'spades'), c(4, 'spades'), c(7, 'spades')]
      ],
      c(5, 'clubs')
    )
    state = { ...state, turns: [{ player: 1, facing: 'diamonds', drew: 2, played: c(10, 'clubs'), named: null, lost: null, reversed: false, out: false }] }
    expect(cpuMove(state, 0, 'hard', () => 0.99)).toEqual({ kind: 'play', cardId: 'diamonds-5-0' })
  })
})

/** A whole game between CPUs, checking every card is in play after every move. */
function playGame(seed: number, levels: CpuLevel[], rules: EightsRules): EightsState {
  const rng = mulberry32(seed * 7 + 1)
  let state = createEightsMatch(seed, levels.length, rules, seed % levels.length)
  for (let step = 0; step < 5000 && state.phase !== 'over'; step++) {
    const player = state.turn
    const level = levels[player]
    let next: EightsState | null
    if (state.phase === 'suit') next = nameSuit(state, player, cpuSuit(state, player, level, rng))
    else {
      const move = cpuMove(state, player, level, rng)
      next = move.kind === 'play' ? play(state, player, move.cardId) : move.kind === 'draw' ? draw(state, player) : pass(state, player)
    }
    expect(next).not.toBeNull()
    state = next!
    expect(cardCount(state)).toBe(52)
  }
  return state
}

describe('CPU games', () => {
  const ruleSets: EightsRules[] = [DEFAULT_EIGHTS_RULES, { draw: 'one', specials: 'twos', hand: 'seven' }, { draw: 'three', specials: 'action', hand: 'five' }]

  it.each([2, 3, 4])('all end with %i players, under every rule', (players) => {
    for (const rules of ruleSets)
      for (let seed = 0; seed < 25; seed++) {
        const state = playGame(seed, Array(players).fill('medium'), rules)
        expect(state.phase).toBe('over')
        expect(state.winners!.length).toBeGreaterThan(0)
      }
  })

  it('has Hard beating Easy most of the time', () => {
    let hardWins = 0
    const games = 120
    for (let seed = 0; seed < games; seed++) {
      const hardFirst = seed % 2 === 0
      const state = playGame(seed, hardFirst ? ['hard', 'easy'] : ['easy', 'hard'], DEFAULT_EIGHTS_RULES)
      if (state.winners!.length === 1 && state.winners![0] === (hardFirst ? 0 : 1)) hardWins++
    }
    expect(hardWins / games).toBeGreaterThan(0.55)
  })
})
