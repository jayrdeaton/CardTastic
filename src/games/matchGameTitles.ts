// The two-player games' names, kept apart from their definitions (which load their screens) so the Settings sheet's
// rules (games/ruleSettings.ts) can name a game without loading it. The solitaire games' are statsTypes.ts' GAME_TITLES.

import type { MatchGameId } from '@/redux/matchStatsSlice'

export const MATCH_GAME_TITLES: Record<MatchGameId, string> = {
  ratslap: 'RatSlap',
  slapjack: 'Slapjack',
  speed: 'Speed',
  war: 'War',
  sixcardgolf: 'Six-Card Golf',
  trash: 'Trash',
  ginrummy: 'Gin Rummy',
  fourcrowns: 'Four Crowns',
  crazyeights: 'Crazy Eights'
}
