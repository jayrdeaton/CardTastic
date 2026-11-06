import { type Card, type Rank, type Suit } from '@tastic/cards'

import { battleCard, canPlay, cardCount, collectBattle, createWarMatch, playStep, warValue } from '@/games/war/engine/rules'
import { type PlayerIndex, SHORT_GAME_BATTLES, type WarState } from '@/games/war/engine/types'

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: false }
}

/** A match whose decks are these cards, the top of each deck last. */
function withHands(one: Card[], two: Card[]): WarState {
  return { ...createWarMatch(1, 'full'), hands: [one, two] }
}

const both = (state: WarState) => playStep(playStep(state, 1)!, 2)!

describe('a battle', () => {
  it('deals 26 face-down cards each', () => {
    const state = createWarMatch(4, 'full')
    expect(state.hands[0]).toHaveLength(26)
    expect(state.hands[1]).toHaveLength(26)
    expect(cardCount(state)).toBe(52)
  })

  it('Aces are high', () => {
    expect(warValue(card(1))).toBeGreaterThan(warValue(card(13)))
    expect(warValue(card(2))).toBeLessThan(warValue(card(3)))
  })

  it('each player turns over their top card, once a step; the higher wins the battle', () => {
    let state = withHands([card(3), card(9, 'hearts')], [card(4), card(5, 'spades')])
    state = playStep(state, 1)!
    expect(playStep(state, 1)).toBeNull()
    expect(battleCard(state, 1)?.rank).toBe(9)
    state = playStep(state, 2)!
    expect(state.battleWinner).toBe(1)
    expect(canPlay(state, 1)).toBe(false)
  })

  it('the winner takes both under their deck', () => {
    const state = collectBattle(both(withHands([card(3), card(9, 'hearts')], [card(4), card(5, 'spades')])))!
    expect(state.hands[0]).toHaveLength(3)
    expect(state.hands[0][2]).toEqual(card(3))
    expect(
      state.hands[0]
        .slice(0, 2)
        .map((c) => c.rank)
        .sort()
    ).toEqual([5, 9])
    expect(state.hands[0].every((c) => !c.faceUp)).toBe(true)
    expect(state.battles).toBe(1)
  })
})

describe('a war', () => {
  const tie = () => both(withHands([card(2), card(3), card(4), card(5), card(10, 'hearts'), card(8)], [card(6), card(7), card(9), card(11), card(12), card(8, 'spades')]))

  it('a tie is a war: three cards face down, one face up, and the higher face-up card takes everything', () => {
    let state = tie()
    expect(state.war).toBe(true)
    expect(state.wars).toBe(1)
    expect(state.battleWinner).toBeNull()
    state = both(state)
    expect(state.battle[0].map((c) => c.faceUp)).toEqual([true, false, false, false, true])
    expect(battleCard(state, 1)?.rank).toBe(3)
    expect(battleCard(state, 2)?.rank).toBe(7)
    expect(state.battleWinner).toBe(2)
    state = collectBattle(state)!
    expect(state.hands[1]).toHaveLength(11)
    expect(state.hands[0]).toHaveLength(1)
    expect(cardCount(state)).toBe(12)
  })

  it('a player with fewer than four cards for a war plays what they have, the last one face up', () => {
    let state = both(withHands([card(13, 'hearts'), card(8)], [card(2), card(3), card(4), card(5), card(6), card(8, 'spades')]))
    state = both(state)
    expect(state.battle[0].map((c) => c.faceUp)).toEqual([true, true])
    expect(state.battleWinner).toBe(1)
  })

  it('a player with no cards left at a tie loses the battle', () => {
    const state = both(withHands([card(8)], [card(2), card(8, 'spades')]))
    expect(state.battleWinner).toBe(2)
    expect(collectBattle(state)!.winner).toBe(2)
  })
})

describe('the match', () => {
  it('a full game ends when one player has every card', () => {
    const state = collectBattle(both(withHands([card(13)], [card(4)])))!
    expect(state.winner).toBe(1)
  })

  it(`a short game ends after ${SHORT_GAME_BATTLES} battles, most cards winning, and can end level`, () => {
    const base: WarState = { ...createWarMatch(2, 'short'), battles: SHORT_GAME_BATTLES - 1 }
    const won = collectBattle(
      both({
        ...base,
        hands: [
          [card(2), card(13)],
          [card(3), card(4)]
        ]
      })
    )!
    expect(won.winner).toBe(1)
    const level = collectBattle(
      both({
        ...base,
        hands: [
          [card(2), card(3), card(13)],
          [card(5), card(6), card(4)]
        ]
      })
    )!
    expect(level.hands[0].length).toBe(4)
    expect(level.winner).toBe(1)
  })

  // Whole matches, both players playing every step: every one ends, every card stays in play.
  function simulate(seed: number, length: 'full' | 'short'): { winner: PlayerIndex | 'tie' | null; battles: number } {
    let state = createWarMatch(seed, length)
    for (let step = 0; step < 50000 && state.winner === null; step++) {
      state = state.battleWinner !== null ? collectBattle(state)! : (playStep(state, canPlay(state, 1) ? 1 : 2) ?? state)
      expect(cardCount(state)).toBe(52)
    }
    return { winner: state.winner, battles: state.battles }
  }

  it('every full game ends', () => {
    const battles: number[] = []
    for (let seed = 0; seed < 200; seed++) {
      const result = simulate(seed, 'full')
      expect(result.winner).not.toBeNull()
      battles.push(result.battles)
    }
    battles.sort((a, b) => a - b)
    // A full game runs a few hundred battles at the median.
    expect(battles[100]).toBeLessThan(1000)
  })

  it('every short game ends after its battles, or sooner', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = simulate(seed, 'short')
      expect(result.winner).not.toBeNull()
      expect(result.battles).toBeLessThanOrEqual(SHORT_GAME_BATTLES)
    }
  })
})
