import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { CPU_LEVELS, type CpuLevel } from '@/games/table/cpuLevel'

// The table games' results (RatSlap, Slapjack, Speed, War, Six-Card Golf, Trash, Gin Rummy, Four Crowns), one entry per game: matches against the CPU
// by its level, and against people, with each game's own tallies (RatSlap's slaps, Golf's holes) and lows (Golf's best
// hole). Kept for everyone (the phone's totals, from seat 1's side against the CPU) and per player (a profile id, or
// GUEST_PLAYER_ID for seat 1's guest; a second guest in seat 2 isn't kept). A match left before its end isn't recorded.
// A player's are dropped with their stats (stores/playerData.ts), everyone's by Reset Stats on Everyone, and a deleted
// profile's with it (redux/packReducers.ts).

/** The table games, in Home's order. */
export const MATCH_GAME_IDS = ['ratslap', 'slapjack', 'speed', 'war', 'sixcardgolf', 'trash', 'ginrummy', 'fourcrowns'] as const
export type MatchGameId = (typeof MATCH_GAME_IDS)[number]

export type MatchOutcome = 'won' | 'lost' | 'tied'

export interface MatchRecord {
  played: number
  won: number
  lost: number
  /** Only Six-Card Golf, War's short game and Speed can end level. */
  tied: number
}

export interface MatchPlayerStats {
  vsCpu: Record<CpuLevel, MatchRecord>
  /** For everyone, only `played` counts: a match between two people is a win and a loss. */
  vsPeople: MatchRecord
  /** The game's own running totals, by name (RatSlap's `slapsWon`, Golf's `holes`), summed over every match. */
  counts: Record<string, number>
  /** The game's own bests where lower is better (Golf's `bestHole`), the lowest ever kept. */
  lows: Record<string, number>
}

export interface MatchGameStats {
  everyone: MatchPlayerStats
  players: Record<string, MatchPlayerStats>
}

/** A game nothing has been recorded for has no entry. */
export type MatchStatsState = Partial<Record<MatchGameId, MatchGameStats>>

const emptyRecord = (): MatchRecord => ({ played: 0, won: 0, lost: 0, tied: 0 })

export function emptyMatchStats(): MatchPlayerStats {
  return { vsCpu: { easy: emptyRecord(), medium: emptyRecord(), hard: emptyRecord() }, vsPeople: emptyRecord(), counts: {}, lows: {} }
}

/** One seat at a finished match: who sat there (null for a player not kept), how it went for them, and their tallies. */
export interface MatchSeatResult {
  player: string | null
  outcome: MatchOutcome
  counts?: Record<string, number>
  lows?: Record<string, number>
}

export interface MatchResult {
  game: MatchGameId
  /** The CPU's level in seat 2, or null for two people. */
  cpu: CpuLevel | null
  /** Seat 1, and seat 2 when a person sat there. */
  seats: MatchSeatResult[]
}

function tally(record: MatchRecord, outcome: MatchOutcome) {
  record.played++
  record[outcome === 'won' ? 'won' : outcome === 'lost' ? 'lost' : 'tied']++
}

function addTallies(stats: MatchPlayerStats, seat: MatchSeatResult) {
  for (const [key, value] of Object.entries(seat.counts ?? {})) stats.counts[key] = (stats.counts[key] ?? 0) + value
  for (const [key, value] of Object.entries(seat.lows ?? {})) stats.lows[key] = Math.min(stats.lows[key] ?? Infinity, value)
}

const initialState: MatchStatsState = {}

const slice = createSlice({
  initialState,
  name: 'matchStats',
  reducers: {
    recordMatch: (state, action: PayloadAction<MatchResult>) => {
      const { game, cpu, seats } = action.payload
      const [first] = seats
      if (!first) return
      const entry = state[game] ?? (state[game] = { everyone: emptyMatchStats(), players: {} })
      if (cpu) tally(entry.everyone.vsCpu[cpu], first.outcome)
      else entry.everyone.vsPeople.played++
      for (const seat of seats) {
        addTallies(entry.everyone, seat)
        if (seat.player === null) continue
        const stats = entry.players[seat.player] ?? (entry.players[seat.player] = emptyMatchStats())
        tally(cpu ? stats.vsCpu[cpu] : stats.vsPeople, seat.outcome)
        addTallies(stats, seat)
      }
    },
    forget: (state, action: PayloadAction<string>) => {
      for (const entry of Object.values(state)) delete entry.players[action.payload]
    },
    clear: () => initialState
  }
})

export const matchStatsActions = slice.actions
export default slice.reducer

/** A player's stats in one game, or everyone's for null, with nothing played as all zeros. */
export function matchStatsFor(state: MatchStatsState | undefined, game: MatchGameId, player: string | null): MatchPlayerStats {
  const entry = state?.[game]
  if (!entry) return emptyMatchStats()
  return player === null ? entry.everyone : (entry.players[player] ?? emptyMatchStats())
}

export function totalVsCpu(stats: MatchPlayerStats): MatchRecord {
  return CPU_LEVELS.reduce((sum, level) => {
    const record = stats.vsCpu[level]
    return { played: sum.played + record.played, won: sum.won + record.won, lost: sum.lost + record.lost, tied: sum.tied + record.tied }
  }, emptyRecord())
}
