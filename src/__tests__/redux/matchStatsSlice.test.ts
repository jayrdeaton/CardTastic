import reducer, { emptyMatchStats, matchStatsActions, matchStatsFor, totalVsCpu } from '@/redux/matchStatsSlice'

// The two-player games' results: everyone's (the phone's) and each player's, per game, against the CPU by level and
// against people, with each game's own tallies and lows.

const start = () => reducer(undefined, { type: 'init' })

describe('matchStats', () => {
  it('a match against the CPU counts for everyone and for seat 1’s player, at the CPU’s level, in its own game', () => {
    const state = reducer(start(), matchStatsActions.recordMatch({ game: 'ratslap', cpu: 'hard', seats: [{ player: 'kid', outcome: 'won', counts: { slapsWon: 4, wrongSlaps: 1 } }] }))
    expect(state.ratslap?.everyone.vsCpu.hard).toEqual({ played: 1, won: 1, lost: 0, tied: 0 })
    expect(state.ratslap?.players.kid.vsCpu.hard).toEqual({ played: 1, won: 1, lost: 0, tied: 0 })
    expect(state.ratslap?.players.kid.counts).toEqual({ slapsWon: 4, wrongSlaps: 1 })
    expect(totalVsCpu(matchStatsFor(state, 'ratslap', 'kid'))).toEqual({ played: 1, won: 1, lost: 0, tied: 0 })
    expect(matchStatsFor(state, 'slapjack', 'kid')).toEqual(emptyMatchStats())
  })

  it('a match between two people counts a win and a loss for the players, and one match played for everyone', () => {
    const state = reducer(
      start(),
      matchStatsActions.recordMatch({
        game: 'slapjack',
        cpu: null,
        seats: [
          { player: 'kid', outcome: 'lost', counts: { slapsWon: 2 } },
          { player: 'dad', outcome: 'won', counts: { slapsWon: 5, wrongSlaps: 2 } }
        ]
      })
    )
    expect(state.slapjack?.everyone.vsPeople.played).toBe(1)
    expect(state.slapjack?.everyone.counts).toEqual({ slapsWon: 7, wrongSlaps: 2 })
    expect(state.slapjack?.players.kid.vsPeople).toEqual({ played: 1, won: 0, lost: 1, tied: 0 })
    expect(state.slapjack?.players.dad.vsPeople).toEqual({ played: 1, won: 1, lost: 0, tied: 0 })
  })

  it('a tie counts as played and tied, and lows keep the lowest', () => {
    let state = reducer(start(), matchStatsActions.recordMatch({ game: 'sixcardgolf', cpu: 'easy', seats: [{ player: 'kid', outcome: 'tied', counts: { holes: 9 }, lows: { bestHole: 4 } }] }))
    state = reducer(state, matchStatsActions.recordMatch({ game: 'sixcardgolf', cpu: 'easy', seats: [{ player: 'kid', outcome: 'won', counts: { holes: 3 }, lows: { bestHole: 7 } }] }))
    expect(state.sixcardgolf?.players.kid.vsCpu.easy).toEqual({ played: 2, won: 1, lost: 0, tied: 1 })
    expect(state.sixcardgolf?.players.kid.counts.holes).toBe(12)
    expect(state.sixcardgolf?.players.kid.lows.bestHole).toBe(4)
  })

  it('a seat 2 guest counts toward everyone’s tallies but keeps no stats of its own', () => {
    const state = reducer(
      start(),
      matchStatsActions.recordMatch({
        game: 'ratslap',
        cpu: null,
        seats: [
          { player: 'guest', outcome: 'won', counts: { slapsWon: 1 } },
          { player: null, outcome: 'lost', counts: { slapsWon: 3 } }
        ]
      })
    )
    expect(Object.keys(state.ratslap?.players ?? {})).toEqual(['guest'])
    expect(state.ratslap?.everyone.counts.slapsWon).toBe(4)
  })

  it('a player’s reset forgets only them, in every game; Reset Everything forgets everyone', () => {
    let state = reducer(start(), matchStatsActions.recordMatch({ game: 'ratslap', cpu: 'easy', seats: [{ player: 'kid', outcome: 'won' }] }))
    state = reducer(state, matchStatsActions.recordMatch({ game: 'trash', cpu: 'easy', seats: [{ player: 'kid', outcome: 'lost' }] }))
    state = reducer(state, matchStatsActions.forget('kid'))
    expect(state.ratslap?.players.kid).toBeUndefined()
    expect(state.trash?.players.kid).toBeUndefined()
    expect(state.ratslap?.everyone.vsCpu.easy.played).toBe(1)
    expect(reducer(state, matchStatsActions.clear())).toEqual({})
  })

  it('reads a player with nothing played, or a store with no entry, as all zeros', () => {
    expect(matchStatsFor(start(), 'trash', 'nobody')).toEqual(emptyMatchStats())
    expect(matchStatsFor(undefined, 'ratslap', null)).toEqual(emptyMatchStats())
  })
})
