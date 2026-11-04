import { useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { ratslapStatsActions } from '@/redux/ratslapStatsSlice'
import { recentWinsActions } from '@/redux/recentWinsSlice'
import type { AppDispatch } from '@/redux/store'
import { topWinsActions } from '@/redux/topWinsSlice'

import { clearProfileGamesInProgress } from './gameInProgress'
import { useGameStats } from './gameStats'

/** Everything Solitaire keeps for one player, by profile id. Resetting everyone is useGameStats' resetAll. A deleted
 * profile needs nothing from here: every reducer that keeps something per player forgets it on @tastic/profile's
 * remove (onProfileRemoved, pack.ts), settings and color pick included. A profile deleted in a sibling app leaves its
 * data behind. */
export function usePlayerData(): { resetPlayer: (profileId: string) => void } {
  const { removeProfileStats } = useGameStats()
  const dispatch = useDispatch<AppDispatch>()
  return useMemo(
    () => ({
      // The player's own stats bucket, their unlocked achievements, their saved deals, the wins their par is made from
      // and their records. Guest's too, by GUEST_PLAYER_ID. The Everyone totals (every deal this phone has seen) keep
      // their games, as they keep a deleted player's. Their settings and color pick stay.
      resetPlayer: (profileId: string) => {
        removeProfileStats(profileId)
        clearProfileGamesInProgress(profileId)
        dispatch(recentWinsActions.forget(profileId))
        dispatch(topWinsActions.forget(profileId))
        dispatch(ratslapStatsActions.forget(profileId))
      }
    }),
    [removeProfileStats, dispatch]
  )
}
