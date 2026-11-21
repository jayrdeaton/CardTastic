import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { SolitaireGameId } from '@/stores/statsTypes'

import { dailyActions } from './dailySlice'

// Each server player's Daily wins by day, for the Records tab's calendar (Jay, 2026-11-20): the games whose Daily the server took,
// under the local day it was dealt for (YYYY-MM-DD). Kept by the player's server id, not the profile, so a player the server
// replaced or one deleted (with its profile, or by Delete Online Data) takes its wins with it, as they go off the boards. Its own
// key, so a store from before it starts empty. Kept from 2026-11-20. Written through stores/daily.ts.
export type DailyHistoryState = Record<string, Record<string, SolitaireGameId[]>>

const initialState: DailyHistoryState = {}

const slice = createSlice({
  name: 'dailyHistory',
  initialState,
  reducers: {
    won: (state, action: PayloadAction<{ player: string; day: string; game: SolitaireGameId }>) => {
      const { player, day, game } = action.payload
      const games = ((state[player] ??= {})[day] ??= [])
      if (!games.includes(game)) games.push(game)
    }
  },
  extraReducers: (builder) => {
    // The players kept on the device: anyone else's wins go
    builder.addCase(dailyActions.playersKept, (state, action) => {
      const live = new Set(action.payload.map(({ player }) => player))
      for (const player of Object.keys(state)) if (!live.has(player)) delete state[player]
    })
  }
})

export const dailyHistoryActions = slice.actions
export default slice.reducer
