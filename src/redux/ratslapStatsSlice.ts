import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { CPU_LEVELS, type CpuLevel } from '@/games/ratslap/engine/cpu'

// RatSlap's results (games/ratslap): matches against the CPU by its level, and against people, with the slaps that won a
// pile and the wrong ones. Kept for everyone (the phone's totals, from seat 1's side against the CPU) and per player (a
// profile id, or GUEST_PLAYER_ID for seat 1's guest; a second guest in seat 2 isn't kept). A match left before its end
// isn't recorded. A player's are dropped with their stats (stores/playerData.ts), everyone's by Reset Stats on Everyone,
// and a deleted profile's with it (redux/packReducers.ts).

export interface RatSlapRecord {
  played: number
  won: number
  lost: number
}

export interface RatSlapPlayerStats {
  vsCpu: Record<CpuLevel, RatSlapRecord>
  /** For everyone, only `played` counts: a match between two people is a win and a loss. */
  vsPeople: RatSlapRecord
  slapsWon: number
  wrongSlaps: number
}

export interface RatSlapStatsState {
  everyone: RatSlapPlayerStats
  players: Record<string, RatSlapPlayerStats>
}

const emptyRecord = (): RatSlapRecord => ({ played: 0, won: 0, lost: 0 })

export function emptyRatSlapStats(): RatSlapPlayerStats {
  return { vsCpu: { easy: emptyRecord(), medium: emptyRecord(), hard: emptyRecord() }, vsPeople: emptyRecord(), slapsWon: 0, wrongSlaps: 0 }
}

const initialState: RatSlapStatsState = { everyone: emptyRatSlapStats(), players: {} }

/** One seat at a finished match: who sat there (null for a player not kept), whether they won, and their slaps. */
export interface RatSlapSeatResult {
  player: string | null
  won: boolean
  slapsWon: number
  wrongSlaps: number
}

export interface RatSlapMatchResult {
  /** The CPU's level in seat 2, or null for two people. */
  cpu: CpuLevel | null
  /** Seat 1, and seat 2 when a person sat there. */
  seats: RatSlapSeatResult[]
}

function tally(record: RatSlapRecord, won: boolean) {
  record.played++
  if (won) record.won++
  else record.lost++
}

const slice = createSlice({
  initialState,
  name: 'ratslapStats',
  reducers: {
    recordMatch: (state, action: PayloadAction<RatSlapMatchResult>) => {
      const { cpu, seats } = action.payload
      const [first] = seats
      if (!first) return
      if (cpu) tally(state.everyone.vsCpu[cpu], first.won)
      else state.everyone.vsPeople.played++
      for (const seat of seats) {
        state.everyone.slapsWon += seat.slapsWon
        state.everyone.wrongSlaps += seat.wrongSlaps
        if (seat.player === null) continue
        const stats = state.players[seat.player] ?? (state.players[seat.player] = emptyRatSlapStats())
        tally(cpu ? stats.vsCpu[cpu] : stats.vsPeople, seat.won)
        stats.slapsWon += seat.slapsWon
        stats.wrongSlaps += seat.wrongSlaps
      }
    },
    forget: (state, action: PayloadAction<string>) => {
      delete state.players[action.payload]
    },
    clear: () => initialState
  }
})

export const ratslapStatsActions = slice.actions
export default slice.reducer

/** A player's stats, or everyone's for null, with nothing played as all zeros. */
export function ratslapStatsFor(state: RatSlapStatsState | undefined, player: string | null): RatSlapPlayerStats {
  if (!state) return emptyRatSlapStats()
  return player === null ? state.everyone : (state.players[player] ?? emptyRatSlapStats())
}

export function totalVsCpu(stats: RatSlapPlayerStats): RatSlapRecord {
  return CPU_LEVELS.reduce((sum, level) => ({ played: sum.played + stats.vsCpu[level].played, won: sum.won + stats.vsCpu[level].won, lost: sum.lost + stats.vsCpu[level].lost }), emptyRecord())
}
