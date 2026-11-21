import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RunAction } from '@tastic/cardtastic-engine'

import type { SolitaireGameId } from '@/stores/statsTypes'

// The Daily Deals, per profile: whether they show on the public boards and the deal they last started in each game. Their player
// on Tastic-Server (its id and key) is @tastic/profile/online's (stores/online.ts), kept in the Keychain, not here. Read and written
// through stores/daily.ts.

/** What a profile's server player shows on the boards. Tied to that player's id: a new player (Delete Online Data, a player the
 * server lost) starts over here too. */
export interface DailyPlayer {
  // The server's id for the profile's player
  player: string
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
  // The Daily Deal on the play screen last opened, so a relaunch into that game goes back to it and not to the regular game
  playing: { owner: string; game: SolitaireGameId; day: string } | null
}

const initialState: DailyState = { players: {}, deals: {}, playing: null }

const fresh = (player: string): DailyPlayer => ({ player, listed: null, shownTag: null, shownColor: null })

const slice = createSlice({
  name: 'daily',
  initialState,
  reducers: {
    // The profile's player, as the server knows it now. Another player than the one on file (the server lost the last one) starts
    // the profile over: what showed and the deals started belonged to the old one
    playerJoined: (state, action: PayloadAction<{ owner: string; player: string }>) => {
      const { owner, player } = action.payload
      if (state.players[owner]?.player === player) return
      state.players[owner] = fresh(player)
      delete state.deals[owner]
    },
    playerChanged: (state, action: PayloadAction<{ owner: string; changes: Partial<Omit<DailyPlayer, 'player'>> }>) => {
      const player = state.players[action.payload.owner]
      if (player) Object.assign(player, action.payload.changes)
    },
    // The players kept on the device (stores/online.ts), each a profile: a profile whose player is gone or replaced (deleted with the
    // profile, by Delete Online Data, or forgotten after the server refused its key) is forgotten here too
    playersKept: (state, action: PayloadAction<{ owner: string; player: string }[]>) => {
      const live = new Map(action.payload.map(({ owner, player }) => [owner, player]))
      const players: DailyState['players'] = {}
      const deals: DailyState['deals'] = {}
      for (const [owner, known] of Object.entries(state.players)) {
        if (live.get(owner) !== known.player) continue
        players[owner] = known
        if (state.deals[owner]) deals[owner] = state.deals[owner]
      }
      return { players, deals, playing: state.playing }
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
    // A deleted profile: its server player goes with it (stores/online.ts' sync)
    forget: (state, action: PayloadAction<string>) => {
      delete state.players[action.payload]
      delete state.deals[action.payload]
    },
    playingSet: (state, action: PayloadAction<DailyState['playing']>) => {
      state.playing = action.payload
    }
  }
})

export const dailyActions = slice.actions
export default slice.reducer
