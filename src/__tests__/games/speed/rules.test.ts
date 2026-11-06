import { type Card, type Rank, type Suit } from '@tastic/cards'

import { mulberry32 } from '@/engine/rng'
import { cpuDraws, cpuMove } from '@/games/speed/engine/cpu'
import { bestPile, canDraw, cardCount, cardsLeft, createSpeedMatch, drawCard, fits, hasMove, isStuck, pilesFor, playCard, turnSides } from '@/games/speed/engine/rules'
import { DEADLOCK_TURNS, DRAW_SIZE, HAND_SIZE, type PlayerIndex, type SpeedState } from '@/games/speed/engine/types'

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: true }
}

function withTable(overrides: Partial<SpeedState>): SpeedState {
  return { ...createSpeedMatch(1), ...overrides }
}

describe('the deal', () => {
  it('five in hand and fifteen to draw each, two side piles of five, one card on each center pile', () => {
    const state = createSpeedMatch(3)
    expect(state.hands[0]).toHaveLength(HAND_SIZE)
    expect(state.hands[1].every((c) => c?.faceUp)).toBe(true)
    expect(state.draws[0]).toHaveLength(DRAW_SIZE)
    expect(state.sides.map((s) => s.length)).toEqual([5, 5])
    expect(state.centers.map((c) => c.length)).toEqual([1, 1])
    expect(cardCount(state)).toBe(52)
  })
})

describe('playing', () => {
  it('a card goes on a center pile one rank up or down, suit no matter, and ranks wrap', () => {
    expect(fits(card(7), card(8, 'hearts'))).toBe(true)
    expect(fits(card(7), card(6))).toBe(true)
    expect(fits(card(7), card(9))).toBe(false)
    expect(fits(card(7), card(7))).toBe(false)
    expect(fits(card(13), card(1))).toBe(true)
    expect(fits(card(1), card(13))).toBe(true)
    expect(fits(card(1), card(2))).toBe(true)
  })

  it('a played card refills its slot from the draw pile', () => {
    const state = withTable({ hands: [[card(7), card(2), card(2, 'hearts'), card(2, 'spades'), card(2, 'diamonds')], createSpeedMatch(1).hands[1]], draws: [[card(11), card(12)], []], centers: [[card(8)], [card(4)]] })
    const next = playCard(state, 1, 0)!
    expect(next.centers[0].map((c) => c.rank)).toEqual([8, 7])
    expect(next.hands[0][0]?.rank).toBe(12)
    expect(next.draws[0]).toHaveLength(1)
    expect(playCard(state, 1, 1)).toBeNull()
    expect(playCard(state, 1, 0, 1)).toBeNull()
  })

  it('a card that fits both piles goes where the rest of the hand can follow it', () => {
    // A 7 fits on the 6 and the 8. On the 8 it leaves the 6 for the hand's 5; on the 6 it leaves the 8 for nothing.
    const state = withTable({ hands: [[card(7), card(5), card(12), card(12, 'hearts'), card(12, 'spades')], createSpeedMatch(1).hands[1]], centers: [[card(6)], [card(8)]] })
    expect(pilesFor(state, card(7))).toEqual([0, 1])
    expect(bestPile(state, 1, 0)).toBe(1)
  })

  it('playing the last card wins', () => {
    const state = withTable({ hands: [[card(7), null, null, null, null], createSpeedMatch(1).hands[1]], draws: [[], createSpeedMatch(1).draws[1]], centers: [[card(8)], [card(2)]] })
    expect(playCard(state, 1, 0)!.winner).toBe(1)
  })
})

describe('when nobody can play', () => {
  const stuckHands: SpeedState['hands'] = [
    [card(7), card(7, 'hearts'), null, null, null],
    [card(10), null, null, null, null]
  ]

  it('a card from each side pile is turned onto the center pile beside it', () => {
    const state = withTable({ hands: stuckHands, draws: [[], []], sides: [[card(4)], [card(11)]], centers: [[card(1)], [card(2)]] })
    expect(isStuck(state)).toBe(true)
    const next = turnSides(state)!
    expect(next.centers.map((c) => c[c.length - 1].rank)).toEqual([4, 11])
    expect(next.sides).toEqual([[], []])
    expect(hasMove(next, 2)).toBe(true)
  })

  it('out of side cards, the center piles but their tops become new side piles', () => {
    const state = withTable({
      hands: stuckHands,
      draws: [[], []],
      sides: [[], []],
      centers: [
        [card(3), card(1)],
        [card(4), card(12), card(2)]
      ]
    })
    const next = turnSides(state)!
    expect(next.refills).toBe(1)
    expect(cardCount(next)).toBe(cardCount(state))
    expect(next.centers.map((c) => c.length)).toEqual([2, 2])
  })

  it('with nothing to turn over, or nobody able to play for long, fewer cards left wins', () => {
    const state = withTable({ hands: stuckHands, draws: [[], []], sides: [[], []], centers: [[card(1)], [card(2)]] })
    expect(turnSides(state)!.winner).toBe(2)
    const long = withTable({ hands: stuckHands, draws: [[], []], sides: [[card(4)], [card(12)]], centers: [[card(1)], [card(2)]], turnsWithoutPlay: DEADLOCK_TURNS })
    expect(turnSides(long)!.winner).toBe(2)
  })

  it('isn’t stuck while anyone can play', () => {
    expect(turnSides(withTable({ hands: stuckHands, centers: [[card(8)], [card(2)]] }))).toBeNull()
  })
})

describe('the CPU', () => {
  it('plays a card that fits, or nothing', () => {
    const state = withTable({ hands: [createSpeedMatch(1).hands[0], [card(2), card(9), null, null, null]], centers: [[card(10)], [card(5)]] })
    expect(cpuMove(state, 2)).toEqual({ slot: 1, pile: 0 })
    expect(cpuMove({ ...state, centers: [[card(5)], [card(5, 'hearts')]] }, 2)).toBeNull()
  })

  // Two CPUs racing: whoever has a card plays it, turn about at random; every match ends with every card still in play.
  function simulate(seed: number): { winner: PlayerIndex | 'tie' | null; steps: number; state: SpeedState } {
    const rng = mulberry32(seed ^ 0x27d4eb2f)
    let state = createSpeedMatch(seed)
    let steps = 0
    while (state.winner === null && steps < 5000) {
      steps++
      if (isStuck(state)) {
        state = turnSides(state)!
        continue
      }
      const first: PlayerIndex = rng() < 0.5 ? 1 : 2
      const player = hasMove(state, first) ? first : first === 1 ? 2 : 1
      const move = cpuMove(state, player)!
      state = playCard(state, player, move.slot, move.pile)!
      expect(cardCount(state)).toBe(52)
    }
    return { winner: state.winner, steps, state }
  }

  it('every match ends, most of them with a player out of cards', () => {
    let playedOut = 0
    for (let seed = 0; seed < 300; seed++) {
      const { winner, state } = simulate(seed)
      expect(winner).not.toBeNull()
      if (winner !== 'tie' && cardsLeft(state, winner!) === 0) playedOut++
    }
    expect(playedOut).toBeGreaterThan(270)
  })
})

describe('the rule choices', () => {
  it('without the wrap, an Ace goes only on a 2 and nothing between King and Ace', () => {
    expect(fits(card(13), card(1), false)).toBe(false)
    expect(fits(card(1), card(13), false)).toBe(false)
    expect(fits(card(1), card(2), false)).toBe(true)
    const state = withTable({ rules: { wrap: false, refill: 'auto' }, centers: [[card(1)], [card(5)]] })
    expect(pilesFor(state, card(13))).toEqual([])
    expect(pilesFor(state, card(2))).toEqual([0])
  })

  it('drawing by hand, a played card leaves its slot empty until the player draws into it', () => {
    const rules = { wrap: true, refill: 'tap' as const }
    const state = withTable({ rules, hands: [[card(7), card(2), card(2, 'hearts'), card(2, 'spades'), card(2, 'diamonds')], createSpeedMatch(1).hands[1]], draws: [[card(11), card(12)], []], centers: [[card(8)], [card(4)]] })
    expect(canDraw(state, 1)).toBe(false)
    expect(drawCard(state, 1)).toBeNull()
    const played = playCard(state, 1, 0)!
    expect(played.hands[0][0]).toBeNull()
    expect(played.draws[0]).toHaveLength(2)
    expect(canDraw(played, 1)).toBe(true)
    const drawn = drawCard(played, 1)!
    expect(drawn.hands[0][0]).toMatchObject({ rank: 12, faceUp: true })
    expect(drawn.draws[0]).toHaveLength(1)
    // Auto refill never draws by hand.
    expect(canDraw({ ...played, rules: { wrap: true, refill: 'auto' } }, 1)).toBe(false)
  })

  it('isn’t stuck while anyone can draw, and the CPU draws when nothing fits', () => {
    const rules = { wrap: true, refill: 'tap' as const }
    const state = withTable({
      rules,
      hands: [
        [card(2), null, null, null, null],
        [card(2, 'hearts'), null, null, null, null]
      ],
      draws: [[card(11)], []],
      centers: [[card(8)], [card(8, 'hearts')]]
    })
    expect(isStuck(state)).toBe(false)
    expect(cpuDraws({ ...state, draws: [[], [card(11)]] }, 2)).toBe(true)
    expect(isStuck({ ...state, draws: [[], []] })).toBe(true)
  })

  it('every match ends drawing by hand without the wrap', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = mulberry32(seed)
      let state = createSpeedMatch(seed, { wrap: false, refill: 'tap' })
      for (let steps = 0; state.winner === null && steps < 5000; steps++) {
        if (isStuck(state)) {
          state = turnSides(state)!
          continue
        }
        const first: PlayerIndex = rng() < 0.5 ? 1 : 2
        const player = hasMove(state, first) || canDraw(state, first) ? first : first === 1 ? 2 : 1
        const move = cpuMove(state, player)
        state = (move ? playCard(state, player, move.slot, move.pile) : drawCard(state, player))!
        expect(cardCount(state)).toBe(52)
      }
      expect(state.winner).not.toBeNull()
    }
  })
})
