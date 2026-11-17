import { useAchievements } from '@tastic/achievements'
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'

import { GUEST_PLAYER_ID } from '@/constants/player'
import { PlayerPar, playerParFor, RECENT_WINS_KEPT } from '@/engine/par'
import type { WinsBefore } from '@/engine/topWins'
import type { VariantId } from '@/engine/variants'
import { achievementsActions, dropProfileStats } from '@/redux/achievementsSlice'
import { matchStatsActions } from '@/redux/matchStatsSlice'
import { recentWinsActions, type RecentWinsState } from '@/redux/recentWinsSlice'
import type { AppDispatch, RootState } from '@/redux/store'
import { topWinsActions, type TopWinsState } from '@/redux/topWinsSlice'

import { ACHIEVEMENT_CATALOG } from './achievementCatalog'
import { clearAllGamesInProgress } from './gameInProgress'
import { usePlayer } from './profiles'
import { applyDealAbandoned, applyDealWon, applyHintUsed, applyUndoUsed, getProfileStatsView } from './statsEngine'
import { AchievementDefinition, DealMetrics, StatsState, UnlockedAchievementsState } from './statsTypes'

interface GameStatsContextValue {
  stats: StatsState
  unlockedAchievements: UnlockedAchievementsState
  // Called the instant a deal is won; `metrics` is the elapsed time/moves/score the screen
  // already shows.
  recordDealWon: (variant: VariantId, metrics: DealMetrics) => AchievementDefinition[]
  // Called the instant the player confirms the "start a new game" warning dialog over a deal that
  // was still in progress (see components/GameChrome.tsx), or leaves a dead board. `played`: how long and how many moves
  // the deal took, for Time Played.
  recordDealAbandoned: (variant: VariantId, played?: { seconds: number; moves: number }) => void
  // Called the instant the Hint button actually produces a hint (not on a press that finds
  // nothing to suggest) - see engine/hint.ts's findHint.
  recordHintUsed: (variant: VariantId) => void
  // Called when an Undo press takes a move back (see GameChrome's onUndoUsed).
  recordUndoUsed: (variant: VariantId) => void
  resetAll: () => void
  removeProfileStats: (profileId: string) => void
  /** Each player's latest wins in each variant, which their par is made from (redux/recentWinsSlice.ts). */
  recentWins: RecentWinsState
  /** Each player's best wins in each variant, by score and by time (redux/topWinsSlice.ts): the Records tab. */
  topWins: TopWinsState
  /** The par the latest win was measured against (the win dialog's), and the player's wins as they stood for its rank
   * ("3rd fastest ever", engine/topWins.ts' rankWin), both taken just before that win joined them, plus the rule set's
   * deals played and won with it (`record`, the win dialog's "112 played" line). null until a win this session. */
  lastWin: { variant: VariantId; par: PlayerPar; before: WinsBefore; record: VariantRecord | null } | null
  /** The player's par in a variant as it stands now, and how many of their wins it comes from (0: expert par). Read from
   * the store when asked (holding the score shows it, GameChrome), so no render subscribes to it. */
  getPlayerPar: (variant: VariantId) => { par: PlayerPar; wins: number }
}

/** A rule set's deals that ended and how many were won. */
export interface VariantRecord {
  played: number
  won: number
}

const GameStatsContext = createContext<GameStatsContextValue | null>(null)

// A store without the slice (a test's) reads as nobody's wins, with one identity so the context value stays put.
const NO_RECENT_WINS: RecentWinsState = {}
const NO_TOP_WINS: TopWinsState = {}

/** A rule set's played and won, as the Stats screen first shows them: the player's own (a profile's, or guest's while
 * profiles exist), or the phone's totals while there are no profiles, where the screen shows Everyone (guest's own count
 * only started 2026-10-22). */
function shownRecord(state: RootState, player: string, variant: VariantId): VariantRecord | null {
  const stats = state.achievements?.stats
  if (!stats) return null
  const shown = (state.profiles?.length ?? 0) === 0 ? stats : stats.profiles[player]
  const record = shown?.variants[variant]?.record
  return record ? { played: record.played, won: record.wins } : null
}

function profileViews(stats: StatsState): Record<string, StatsState> {
  return Object.fromEntries(Object.entries(stats.profiles).map(([profileId, bucket]) => [profileId, getProfileStatsView(bucket)]))
}

export function GameStatsProvider({ children }: { children: ReactNode }) {
  const { profileId } = usePlayer()
  // Whose bucket a deal also goes into, besides the phone's totals (Everyone): the profile playing, or guest. Guest's
  // play was kept only in the totals until 2026-10-22 (Jay asked for Guest in the Stats screen's player picker), so its
  // bucket starts from then.
  const player = profileId ?? GUEST_PLAYER_ID
  const { stats, unlockedAchievements, recordOutcome, resetAll, removeProfile } = useAchievements<StatsState, RootState>({
    catalog: ACHIEVEMENT_CATALOG,
    select: (state) => state.achievements,
    actions: achievementsActions,
    profileViews
  })

  const store = useStore<RootState>()
  const dispatch = useDispatch<AppDispatch>()
  const recentWins = useSelector((state: RootState) => state.recentWins) ?? NO_RECENT_WINS
  const topWins = useSelector((state: RootState) => state.topWins) ?? NO_TOP_WINS
  const [lastWin, setLastWin] = useState<GameStatsContextValue['lastWin']>(null)

  const recordDealWon = useCallback(
    (variant: VariantId, metrics: DealMetrics) => {
      const { score, moves, seconds } = metrics
      let measured: { par: PlayerPar; before: WinsBefore } | null = null
      if (score !== null && moves !== null && seconds !== null) {
        // The win is measured against the player's par and ranked among their wins as they stood BEFORE this win (read from
        // the store, not a render, so they are never a win behind), and only then joins them.
        const state = store.getState()
        const bucket = state.achievements?.stats.profiles[player]?.variants[variant]
        const before: WinsBefore = { top: state.topWins?.[player]?.[variant], wins: bucket?.record.wins ?? 0, bestScore: bucket?.bestScore ?? null, bestSeconds: bucket?.bestTimeSeconds ?? null }
        measured = { par: playerParFor(variant, state.recentWins?.[player]?.[variant] ?? []), before }
        dispatch(recentWinsActions.add({ player, variant, win: { score, moves, seconds } }))
        dispatch(topWinsActions.add({ player, variant, win: { score, moves, seconds, at: Date.now() } }))
      }
      const result = recordOutcome((prev) => applyDealWon(prev, variant, metrics, player))
      // The rule set's played and won with this win counted, for the win dialog.
      if (measured) setLastWin({ variant, ...measured, record: shownRecord(store.getState(), player, variant) })
      // Solitaire is single-player: whatever the player unlocked is the same person the
      // device-wide unlocks belong to, so both lists are surfaced together rather than separately.
      return [...result.device, ...(result.profiles[player] ?? [])]
    },
    [recordOutcome, player, store, dispatch]
  )

  const recordDealAbandoned = useCallback(
    (variant: VariantId, played?: { seconds: number; moves: number }) => {
      recordOutcome((prev) => applyDealAbandoned(prev, variant, player, new Date(), played))
    },
    [recordOutcome, player]
  )

  const recordUndoUsed = useCallback(
    (variant: VariantId) => {
      recordOutcome((prev) => applyUndoUsed(prev, variant, player))
    },
    [recordOutcome, player]
  )

  const recordHintUsed = useCallback(
    (variant: VariantId) => {
      recordOutcome((prev) => applyHintUsed(prev, variant, player))
    },
    [recordOutcome, player]
  )

  const removeProfileStats = useCallback(
    (profileId: string) => {
      removeProfile(profileId, (prev) => dropProfileStats(prev, profileId))
    },
    [removeProfile]
  )

  // Wraps the package's own resetAll (which only knows about the achievements slice) so
  // "Reset Stats" also drops any resumable saves - leaving one behind after an explicit full reset
  // would be the more surprising outcome. Every player's, like the stats it resets, and so is every player's par and
  // records.
  const resetAllAndProgress = useCallback(() => {
    resetAll()
    clearAllGamesInProgress()
    dispatch(recentWinsActions.clear())
    dispatch(topWinsActions.clear())
    dispatch(matchStatsActions.clear())
  }, [resetAll, dispatch])

  const getPlayerPar = useCallback(
    (variant: VariantId) => {
      const recent = store.getState().recentWins?.[player]?.[variant] ?? []
      return { par: playerParFor(variant, recent), wins: Math.min(recent.length, RECENT_WINS_KEPT) }
    },
    [store, player]
  )

  const value = useMemo(
    () => ({
      stats,
      unlockedAchievements,
      recordDealWon,
      recordDealAbandoned,
      recordHintUsed,
      recordUndoUsed,
      resetAll: resetAllAndProgress,
      removeProfileStats,
      recentWins,
      topWins,
      lastWin,
      getPlayerPar
    }),
    [stats, unlockedAchievements, recordDealWon, recordDealAbandoned, recordHintUsed, recordUndoUsed, resetAllAndProgress, removeProfileStats, recentWins, topWins, lastWin, getPlayerPar]
  )

  return <GameStatsContext.Provider value={value}>{children}</GameStatsContext.Provider>
}

export function useGameStats() {
  const ctx = useContext(GameStatsContext)
  if (!ctx) throw new Error('useGameStats must be used within a GameStatsProvider')
  return ctx
}
