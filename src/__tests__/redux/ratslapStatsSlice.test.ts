import reducer, { emptyRatSlapStats, ratslapStatsActions, ratslapStatsFor, totalVsCpu } from '@/redux/ratslapStatsSlice'

// RatSlap's results: everyone's (the phone's) and each player's, against the CPU by level and against people.

const start = () => reducer(undefined, { type: 'init' })

describe('ratslapStats', () => {
  it('a match against the CPU counts for everyone and for seat 1’s player, at the CPU’s level', () => {
    const state = reducer(start(), ratslapStatsActions.recordMatch({ cpu: 'hard', seats: [{ player: 'kid', won: true, slapsWon: 4, wrongSlaps: 1 }] }))
    expect(state.everyone.vsCpu.hard).toEqual({ played: 1, won: 1, lost: 0 })
    expect(state.players.kid.vsCpu.hard).toEqual({ played: 1, won: 1, lost: 0 })
    expect(state.players.kid.slapsWon).toBe(4)
    expect(state.players.kid.wrongSlaps).toBe(1)
    expect(totalVsCpu(state.players.kid)).toEqual({ played: 1, won: 1, lost: 0 })
  })

  it('a match between two people counts a win and a loss for the players, and one match played for everyone', () => {
    const state = reducer(
      start(),
      ratslapStatsActions.recordMatch({
        cpu: null,
        seats: [
          { player: 'kid', won: false, slapsWon: 2, wrongSlaps: 0 },
          { player: 'dad', won: true, slapsWon: 5, wrongSlaps: 2 }
        ]
      })
    )
    expect(state.everyone.vsPeople.played).toBe(1)
    expect(state.everyone.slapsWon).toBe(7)
    expect(state.players.kid.vsPeople).toEqual({ played: 1, won: 0, lost: 1 })
    expect(state.players.dad.vsPeople).toEqual({ played: 1, won: 1, lost: 0 })
  })

  it('a seat 2 guest counts toward everyone’s slaps but keeps no stats of its own', () => {
    const state = reducer(
      start(),
      ratslapStatsActions.recordMatch({
        cpu: null,
        seats: [
          { player: 'guest', won: true, slapsWon: 1, wrongSlaps: 0 },
          { player: null, won: false, slapsWon: 3, wrongSlaps: 0 }
        ]
      })
    )
    expect(Object.keys(state.players)).toEqual(['guest'])
    expect(state.everyone.slapsWon).toBe(4)
  })

  it('a player’s reset forgets only them; Reset Everything forgets everyone', () => {
    let state = reducer(start(), ratslapStatsActions.recordMatch({ cpu: 'easy', seats: [{ player: 'kid', won: true, slapsWon: 0, wrongSlaps: 0 }] }))
    state = reducer(state, ratslapStatsActions.forget('kid'))
    expect(state.players.kid).toBeUndefined()
    expect(state.everyone.vsCpu.easy.played).toBe(1)
    expect(reducer(state, ratslapStatsActions.clear()).everyone).toEqual(emptyRatSlapStats())
  })

  it('reads a player with nothing played, or a store from before RatSlap, as all zeros', () => {
    expect(ratslapStatsFor(start(), 'nobody')).toEqual(emptyRatSlapStats())
    expect(ratslapStatsFor(undefined, null)).toEqual(emptyRatSlapStats())
  })
})
