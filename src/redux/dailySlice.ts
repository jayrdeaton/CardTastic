import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RunAction } from '@tastic/cardtastic-engine'

import type { SolitaireGameId } from '@/stores/statsTypes'

// The Daily Deals, per player (a profile's id, or GUEST_PLAYER_ID): their player on Tastic-Server and the deal they last started in
// each game. Read and written through stores/daily.ts.

/** A player's account on the server: anonymous (no name, no sign-in), one per profile. */
export interface DailyPlayer {
  id: string
  token: string
  // Whether their wins show on the public boards: null until they've been asked, on their first Daily win
  listed: boolean | null
  // The tag and color the server last got for them, so a change can be sent
  shownTag: string | null
  shownColor: string | null
}

/** A win as the server ranked it. `rank` is where it stands among listed players (where it would, for a player not listed). */
export interface DailyResult {
  moves: number
  seconds: number
  score: number
  rank: number
}

export interface DailyDeal {
  day: string
  seed: number
  startedAt: string
  result: DailyResult | null
  // A winning run still to reach the server (kept across a relaunch, until it does)
  unsent: RunAction[] | null
  // The server replayed the run and refused it
  refused: boolean
}

export interface DailyState {
  players: Record<string, DailyPlayer>
  deals: Record<string, Partial<Record<SolitaireGameId, DailyDeal>>>
  // Tokens of deleted profiles' players, whose server data is still to be deleted
  orphans: string[]
  // The Daily Deal on the play screen last opened, so a relaunch into that game goes back to it and not to the regular game
  playing: { owner: string; game: SolitaireGameId; day: string } | null
}

const initialState: DailyState = { players: {}, deals: {}, orphans: [], playing: null }

const slice = createSlice({
  name: 'daily',
  initialState,
  reducers: {
    playerMade: (state, action: PayloadAction<{ owner: string; player: DailyPlayer }>) => {
      state.players[action.payload.owner] = action.payload.player
    },
    playerChanged: (state, action: PayloadAction<{ owner: string; changes: Partial<DailyPlayer> }>) => {
      const player = state.players[action.payload.owner]
      if (player) Object.assign(player, action.payload.changes)
    },
    // The server no longer knows this player (its token was refused): a new one will be made. Their deals went with them.
    playerLost: (state, action: PayloadAction<string>) => {
      delete state.players[action.payload]
      delete state.deals[action.payload]
    },
    dealStarted: (state, action: PayloadAction<{ owner: string; game: SolitaireGameId; deal: Pick<DailyDeal, 'day' | 'seed' | 'startedAt' | 'result'> }>) => {
      const { owner, game, deal } = action.payload
      const known = state.deals[owner]?.[game]
      const same = known?.day === deal.day && known.seed === deal.seed
      state.deals[owner] = { ...state.deals[owner], [game]: { ...deal, unsent: same && !deal.result ? known.unsent : null, refused: same ? known.refused : false } }
    },
    runWon: (state, action: PayloadAction<{ owner: string; game: SolitaireGameId; actions: RunAction[] }>) => {
      const deal = state.deals[action.payload.owner]?.[action.payload.game]
      if (deal && !deal.result) deal.unsent = action.payload.actions
    },
    runPosted: (state, action: PayloadAction<{ owner: string; game: SolitaireGameId; result: DailyResult }>) => {
      const deal = state.deals[action.payload.owner]?.[action.payload.game]
      if (!deal) return
      deal.result = action.payload.result
      deal.unsent = null
      deal.refused = false
    },
    runRefused: (state, action: PayloadAction<{ owner: string; game: SolitaireGameId }>) => {
      const deal = state.deals[action.payload.owner]?.[action.payload.game]
      if (!deal) return
      deal.unsent = null
      deal.refused = true
    },
    // A player gone from this device (a deleted profile, or Delete Daily Scores): their server data is deleted as soon as it can be
    forget: (state, action: PayloadAction<string>) => {
      const player = state.players[action.payload]
      if (player) state.orphans.push(player.token)
      delete state.players[action.payload]
      delete state.deals[action.payload]
    },
    playingSet: (state, action: PayloadAction<DailyState['playing']>) => {
      state.playing = action.payload
    },
    orphanDeleted: (state, action: PayloadAction<string>) => {
      state.orphans = state.orphans.filter((token) => token !== action.payload)
    }
  }
})

export const dailyActions = slice.actions
export default slice.reducer
