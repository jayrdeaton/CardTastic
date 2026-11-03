import { createAchievementsSlice } from '@tastic/achievements'

import type { StatsState } from '@/stores/statsTypes'
import { DEFAULT_STATS, isValidStats, migrateStats } from '@/stores/statsValidation'

// This app's stats and unlocked achievements, persisted with the rest of the store and read and
// written only through stores/gameStats.tsx (@tastic/achievements' useAchievements). On rehydrate,
// stats that fail isValidStats fall back to DEFAULT_STATS, and migrateStats backfills newer fields.
const { actions, reducer } = createAchievementsSlice<StatsState>({
  defaultStats: DEFAULT_STATS,
  isValidStats,
  migrateStats
})

export const achievementsActions = actions
export default reducer

/** `stats` without one player's own bucket: a player's reset (stores/gameStats.tsx) and a deleted profile (pack.ts).
 * The Everyone totals keep their games. */
export function dropProfileStats(stats: StatsState, profileId: string): StatsState {
  if (!(profileId in stats.profiles)) return stats
  const { [profileId]: _removed, ...rest } = stats.profiles
  return { ...stats, profiles: rest }
}
