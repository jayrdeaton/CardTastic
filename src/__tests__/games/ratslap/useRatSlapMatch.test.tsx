import { type Card, type Rank, type Suit } from '@tastic/cards'
import { act, renderHook } from '@testing-library/react-native'

import { CPU_STYLES } from '@/games/ratslap/engine/cpu'
import { DEFAULT_RULES, type RatSlapState } from '@/games/ratslap/engine/types'
import { CHALLENGE_COLLECT_BEAT_MS, type MatchEvents, SLAP_COLLECT_BEAT_MS, useRatSlapMatch } from '@/games/ratslap/useRatSlapMatch'

// One RatSlap match as the screen runs it: the players' plays and slaps, the CPU in seat 2 on its own timers, and a won
// pile collected after a beat.

function card(rank: Rank, suit: Suit = 'clubs', idSuffix = ''): Card {
  return { id: `${suit}-${rank}${idSuffix}`, suit, rank, faceUp: false }
}

function makeState(overrides: Partial<RatSlapState> = {}): RatSlapState {
  return {
    rules: DEFAULT_RULES,
    hands: [
      [card(3, 'clubs', '-a'), card(4, 'clubs', '-b')],
      [card(5, 'hearts', '-c'), card(6, 'hearts', '-d')]
    ],
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

function events(): jest.Mocked<MatchEvents> {
  return { played: jest.fn(), burned: jest.fn(), wonPile: jest.fn(), collected: jest.fn(), matchOver: jest.fn() }
}

/** The CPU's dice: always `value`. Above every level's miss chance, so it never misses a good pile. */
const dice = (value: number) => () => value

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms))

describe('useRatSlapMatch', () => {
  it('a player’s play is told to the screen, and then the CPU plays its card after its pause', async () => {
    const heard = events()
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: 'medium', paused: false, events: heard, rng: dice(0.5), initialState: makeState() }))

    await act(() => {
      expect(result.current.play(1)).toBe(true)
    })
    expect(heard.played).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 'clubs-4-b', faceUp: true }))
    expect(result.current.play(1)).toBe(false)

    await wait(CPU_STYLES.medium.playDelayMs[1])
    expect(heard.played).toHaveBeenLastCalledWith(2, expect.objectContaining({ id: 'hearts-6-d' }))
  })

  it('the CPU slaps a double instead of playing over it, and the slapped pile goes to it after the beat', async () => {
    const heard = events()
    const state = makeState({
      hands: [
        [card(3), card(7, 'diamonds', '-x')],
        [card(5, 'hearts'), card(6, 'hearts')]
      ],
      pile: [{ ...card(7, 'hearts', '-y'), faceUp: true }]
    })
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: 'medium', paused: false, events: heard, rng: dice(0.5), initialState: state }))

    await act(() => {
      result.current.play(1)
    })
    await wait(CPU_STYLES.medium.slapDelayMs[1])
    expect(heard.wonPile).toHaveBeenCalledWith(2, true)
    expect(heard.played).toHaveBeenCalledTimes(1)

    await wait(SLAP_COLLECT_BEAT_MS)
    expect(heard.collected).toHaveBeenCalledWith(2, expect.arrayContaining([expect.objectContaining({ id: 'diamonds-7-x' })]))
    expect(result.current.state.hands[1]).toHaveLength(4)
  })

  it('a player who slaps first wins the pile; the CPU’s later slap comes too late', async () => {
    const heard = events()
    const state = makeState({
      hands: [
        [card(3), card(7, 'diamonds', '-x')],
        [card(5, 'hearts'), card(6, 'hearts')]
      ],
      pile: [{ ...card(7, 'hearts', '-y'), faceUp: true }]
    })
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: 'hard', paused: false, events: heard, rng: dice(0.5), initialState: state }))

    await act(() => {
      result.current.play(1)
    })
    await act(() => {
      expect(result.current.slap(1)).toBe('won')
    })
    await wait(CPU_STYLES.hard.slapDelayMs[1])
    expect(heard.wonPile).toHaveBeenCalledTimes(1)
    expect(heard.wonPile).toHaveBeenCalledWith(1, true)
  })

  it('a wrong slap burns the player’s top card', async () => {
    const heard = events()
    const state = makeState({
      pile: [
        { ...card(2), faceUp: true },
        { ...card(9), faceUp: true }
      ]
    })
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: null, paused: false, events: heard, initialState: state }))

    await act(() => {
      expect(result.current.slap(1)).toBe('burned')
    })
    expect(heard.burned).toHaveBeenCalledWith(1, expect.objectContaining({ id: 'clubs-4-b', faceUp: false }))
  })

  it('a pile won by a face card waits the longer beat, in which a double can still be slapped away', async () => {
    const heard = events()
    const jack = { ...card(11, 'spades', '-j'), faceUp: true }
    // Player 1 answers the CPU's Jack with a 7 onto a 7: the CPU wins the pile, but a double is showing.
    const state = makeState({ hands: [[card(3), card(7, 'diamonds', '-x')], [card(5, 'hearts')]], pile: [{ ...card(7, 'hearts', '-y'), faceUp: true }, jack], challenge: { triggerCard: jack, requiredChances: 1, chancesUsed: 0, attacker: 2, defender: 1 } })
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: null, paused: false, events: heard, initialState: state }))

    await act(() => {
      result.current.play(1)
    })
    expect(result.current.state.pileWinner).toBe(2)
    await wait(SLAP_COLLECT_BEAT_MS)
    expect(heard.collected).not.toHaveBeenCalled()

    // Not a double (the Jack sits between the 7s), so that pile can't be slapped: it is collected after the long beat.
    await wait(CHALLENGE_COLLECT_BEAT_MS)
    expect(heard.collected).toHaveBeenCalledWith(2, expect.any(Array))
  })

  it('nothing happens while paused, and the CPU looks again once play goes on', async () => {
    const heard = events()
    let paused = true
    const { result, rerender } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: 'easy', paused, events: heard, rng: dice(0.5), initialState: makeState({ turn: 2 }) }))

    await wait(5000)
    expect(heard.played).not.toHaveBeenCalled()

    paused = false
    await act(() => rerender({}))
    await wait(CPU_STYLES.easy.playDelayMs[1])
    expect(heard.played).toHaveBeenCalledWith(2, expect.anything())
    expect(result.current.state.pile).toHaveLength(1)
  })

  it('collecting the last pile ends the match, and a rematch deals again with the loser first', async () => {
    const heard = events()
    const state = makeState({ hands: [[], [card(5, 'hearts')]], pile: [{ ...card(9), faceUp: true }], pileWinner: 2 })
    const { result } = await renderHook(() => useRatSlapMatch({ rules: DEFAULT_RULES, cpu: null, paused: false, events: heard, seed: () => 7, initialState: state }))

    await wait(CHALLENGE_COLLECT_BEAT_MS)
    expect(heard.matchOver).toHaveBeenCalledWith(2)
    expect(result.current.state.winner).toBe(2)

    await act(() => result.current.rematch())
    expect(result.current.state.winner).toBeNull()
    expect(result.current.state.turn).toBe(1)
    expect(result.current.state.hands[0]).toHaveLength(27)
  })
})
