import { getBlendedColor } from '@rific/auto-paper'
import { getAchievementCatalogRows } from '@tastic/achievements'
import { AchievementRow, LOCKED_BADGE_COLOR, StatRow, StatSection } from '@tastic/hud/chrome'
import type { PackStatsReset, PackStatsSectionsProps } from '@tastic/shell'
import { type ComponentType, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SegmentedButtons, useTheme } from 'react-native-paper'

import { PlayCalendar } from '@/components/PlayCalendar'
import { type GameFilter, RecordsList } from '@/components/RecordsList'
import { GUEST_PLAYER_ID } from '@/constants/player'
import { parFor, playerParFor, vsParShort } from '@/engine/par'
import type { TopWinsBoard } from '@/engine/topWins'
import { VARIANTS } from '@/engine/variants'
import { ACHIEVEMENT_CATALOG } from '@/stores/achievementCatalog'
import { useGameStats } from '@/stores/gameStats'
import { usePlayerData } from '@/stores/playerData'
import { useProfiles } from '@/stores/profiles'
import { getAverageWin, getBestParRatio, getBestStreak, getBusiestDay, getCardsDealt, getGamesWon, getGameView, getLeastPlayedGame, getMostPlayedGame, getProfileStatsView, getTotalHintsUsed, getTotalLosses, getTotalMoves, getTotalPlayed, getTotalSeconds, getTotalUndosUsed, getTotalWins, getTotalWinsWithoutHint } from '@/stores/statsEngine'
import { GAME_TITLES, SOLITAIRE_GAME_IDS, type SolitaireGameId, type StatsState } from '@/stores/statsTypes'
import { DEFAULT_PROFILE_STATS } from '@/stores/statsValidation'
import { commaString } from '@/utils/commaString'

// What Solitaire puts on @tastic/shell's stats screen (app/stats.tsx): the Stats tab's section across every game
// (`SolitaireStatsSections`, the pack's `StatsSections`), each game's rule sets (`gameStatsSections`, each game's
// `StatsSections`), the Records tab (`RecordsTab`, in the pack's `statsTabs`), the achievements across every game
// (`SolitaireAchievementList`, the pack's `AchievementList`) and the Reset that follows the player picker (`statsReset`).
// The screen itself (the tabs, the two pickers, opening on whoever is playing, the press-away) is the shell's. Every
// part is handed the picked player: null for Everyone (the phone's totals), GUEST_PLAYER_ID for guest, who has a bucket
// of their own like a profile (stores/gameStats.tsx), or a profile's id.

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A total of play time: minutes and seconds under an hour, then hours and minutes ("3h 05m"). */
function formatDuration(seconds: number): string {
  if (seconds < 3600) return formatTime(seconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const winRate = (wins: number, played: number) => (played > 0 ? `${Math.round((wins / played) * 100)}%` : '-')

/** The stats the picked player's sections read: their bucket as a view, or the phone's totals for Everyone. */
function statsViewFor(stats: StatsState, profileId: string | null): StatsState {
  return profileId ? getProfileStatsView(stats.profiles[profileId] ?? DEFAULT_PROFILE_STATS) : stats
}

/** The Stats tab's section across every game, first on the page: the calendar of play (a year at a glance, and its tap
 * line has room over the label; Jay, 2026-10-22), the totals (under the game's name when narrowed to one: which games
 * were solved and the most and least played then have nothing to say) and Activity. Narrowed to one game, the days and
 * day streaks come from the day log too (getGameView), and there is no win streak across games. */
export function SolitaireStatsSections({ profileId, gameId }: PackStatsSectionsProps) {
  const { stats } = useGameStats()
  const game = (gameId ?? 'all') as GameFilter
  const statsView = statsViewFor(stats, profileId)
  const shown = game === 'all' ? statsView : getGameView(statsView, game)

  const played = getTotalPlayed(shown)
  const wins = getTotalWins(shown)
  const bestScoreVsPar = getBestParRatio(shown, 'score')
  const mostPlayed = getMostPlayedGame(shown)
  const leastPlayed = getLeastPlayedGame(shown)
  const busiestDay = getBusiestDay(shown)

  return (
    <>
      <StatSection label='CALENDAR'>
        <PlayCalendar days={shown.days} />
      </StatSection>

      <StatSection label={game === 'all' ? 'OVERALL' : GAME_TITLES[game].toUpperCase()}>
        <StatRow label='Games Played' value={commaString(played)} />
        <StatRow label='Wins' value={commaString(wins)} />
        <StatRow label='Losses' value={commaString(getTotalLosses(shown))} />
        <StatRow label='Win Rate' value={winRate(wins, played)} />
        <StatRow label='Best Game Streak' value={commaString(getBestStreak(shown))} />
        {game === 'all' && <StatRow label='Games Solved' value={`${getGamesWon(shown)} / ${SOLITAIRE_GAME_IDS.length}`} />}
        {/* Overall bests are measured against par: a raw lowest score or fastest time across all 11 games would just name the
        quickest game (Golf, Aces Up), not the best play. */}
        <StatRow label='Best vs Par' value={bestScoreVsPar === null ? '-' : vsParShort(bestScoreVsPar, 1)} />
        {game === 'all' && <StatRow label='Most Played' value={mostPlayed ? GAME_TITLES[mostPlayed] : '-'} />}
        {game === 'all' && leastPlayed && <StatRow label='Least Played' value={GAME_TITLES[leastPlayed]} />}
        {/* Time Played and Moves Made count every deal that ended, won or lost, since 2026-10-22 (statsTypes.ts). */}
        <StatRow label='Time Played' value={formatDuration(getTotalSeconds(shown))} />
        <StatRow label='Moves Made' value={commaString(getTotalMoves(shown))} />
        <StatRow label='Cards Dealt' value={commaString(getCardsDealt(shown))} />
        <StatRow label='Hints Used' value={commaString(getTotalHintsUsed(shown))} />
        <StatRow label='Undos Used' value={commaString(getTotalUndosUsed(shown))} />
        <StatRow label='Wins Without Hints' value={commaString(getTotalWinsWithoutHint(shown))} />
      </StatSection>

      {/* Win Streak runs across every game, from 2026-10-22; Most Deals in a Day reads the day log kept from then
      (stores/statsTypes.ts' `days`). */}
      <StatSection label='ACTIVITY'>
        <StatRow label='Days Played' value={commaString(shown.distinctDaysPlayed)} />
        <StatRow label='Day Streak' value={commaString(shown.currentDayStreak)} />
        <StatRow label='Best Day Streak' value={commaString(shown.bestDayStreak)} />
        {game === 'all' && <StatRow label='Win Streak, All Games' value={`${shown.winStreak.currentWinStreak} (best ${shown.winStreak.bestWinStreak})`} />}
        <StatRow label='Most Deals in a Day' value={busiestDay ? commaString(busiestDay.played) : '-'} />
      </StatSection>
    </>
  )
}

/** One game's rule sets on the Stats tab (its `StatsSections`): a well per variant, one game under one rule set
 * (engine/variants.ts), since a 1-suit and a 4-suit Spider win aren't the same. A game's default rules always show, its
 * other rules once a deal under them has been played. Expert Par is a variant's par in full (score, time, moves;
 * engine/par.ts), Your Par the shown player's own (their last 20 wins), and each best and Your Par say how they compare
 * with it, in a word since the Expert Par row is right above them ("7% under", "even", "7% over"). "Lost" counts both
 * ways a deal ends without a win: dealt over mid-game, and the No Moves Left dead board (useStuckLossCheck, off for now:
 * constants/deadBoardLoss.ts).
 *
 * The shell hands a game's sections only the player, not the game picker, so narrowed to one game this still shows only
 * its default and played rules (Solitaire's own screen showed all of them there). */
export function gameStatsSections(gameId: SolitaireGameId): ComponentType<{ profileId: string | null }> {
  const variants = VARIANTS.filter((info) => info.game === gameId)
  return function GameStatsSections({ profileId }: { profileId: string | null }) {
    const { stats, recentWins } = useGameStats()
    const { profiles } = useProfiles()
    const shown = statsViewFor(stats, profileId)
    // Whose par the rows show: the player picked, or guest on a phone with no profiles (Everyone is then just guest).
    // Everyone with profiles is everyone at once, and a par is one player's (engine/par.ts' playerParFor).
    const parPlayer = profileId ?? (profiles.length === 0 ? GUEST_PLAYER_ID : null)
    return (
      <>
        {variants
          .filter((info, i) => i === 0 || shown.variants[info.id].record.played > 0)
          .map((info) => {
            const v = shown.variants[info.id]
            const par = parFor(info.id)
            const vsExpert = (best: number | null, expert: number, show: (n: number) => string) => (best === null ? '-' : `${show(best)} · ${vsParShort(best, expert)}`)
            const yourPar = parPlayer === null ? null : playerParFor(info.id, recentWins[parPlayer]?.[info.id] ?? [])
            // The average win is over the wins added up since 2026-10-22 (statsTypes.ts' winsCounted).
            const average = getAverageWin(v)
            return (
              <StatSection key={info.id} label={`${GAME_TITLES[info.game]}${info.label ? ` · ${info.label}` : ''}`.toUpperCase()}>
                <StatRow label='Played' value={commaString(v.record.played)} />
                <StatRow label='Won' value={commaString(v.record.wins)} />
                <StatRow label='Lost' value={commaString(v.record.losses)} />
                <StatRow label='Win Rate' value={winRate(v.record.wins, v.record.played)} />
                <StatRow label='Streak' value={`${v.streak.currentWinStreak} (best ${v.streak.bestWinStreak})`} />
                <StatRow label='Expert Par' value={`${commaString(par.score)} · ${formatTime(par.seconds)} · ${commaString(par.moves)} moves`} />
                {yourPar && <StatRow label='Your Par' value={yourPar.kind === 'personal' ? `${commaString(yourPar.score)} · ${vsParShort(yourPar.score, par.score)}` : '-'} />}
                <StatRow label='Best Score' value={vsExpert(v.bestScore, par.score, commaString)} />
                <StatRow label='Fastest' value={vsExpert(v.bestTimeSeconds, par.seconds, formatTime)} />
                <StatRow label='Fewest Moves' value={vsExpert(v.bestMoves, par.moves, commaString)} />
                <StatRow label='Average Score' value={average ? commaString(Math.round(average.score)) : '-'} />
                <StatRow label='Average Time' value={average ? formatTime(average.seconds) : '-'} />
                <StatRow label='Average Moves' value={average ? commaString(Math.round(average.moves)) : '-'} />
                <StatRow label='Time Played' value={formatDuration(v.totalSeconds)} />
                <StatRow label='Hints Used' value={commaString(v.hintsUsed)} />
                <StatRow label='Undos Used' value={commaString(v.undosUsed)} />
                <StatRow label='Wins Without Hints' value={commaString(v.winsWithoutHint)} />
              </StatSection>
            )
          })}
      </>
    )
  }
}

/** The Records tab's two boards, named like the Stats tab's rows they extend. */
const BOARDS = [
  { value: 'score', label: 'Best Score' },
  { value: 'time', label: 'Fastest' }
]

/** The Records tab (the pack's `statsTabs`): each rule set's best wins, by score or by time (RecordsList), narrowed by
 * both pickers. */
export function RecordsTab({ profileId, gameId }: PackStatsSectionsProps) {
  const { colors } = useTheme()
  const { stats, topWins } = useGameStats()
  const { profiles } = useProfiles()
  const [board, setBoard] = useState<TopWinsBoard>('score')
  return (
    <>
      <SegmentedButtons value={board} onValueChange={(value) => setBoard(value as TopWinsBoard)} buttons={BOARDS} style={[styles.boards, { backgroundColor: colors.surface }]} />
      <RecordsList board={board} topWins={topWins} stats={stats} profiles={profiles} profileId={profileId} game={(gameId ?? 'all') as GameFilter} />
    </>
  )
}

/** The Achievements tab (the pack's `AchievementList`): milestones across every game, so the game picker goes there.
 * The wells are hud's own (the theme's surface, the same as every raised card). The check mark and progress bar are the
 * tier color mixed half with black in light mode, as hud's AchievementCatalogSection does: raw gold and silver barely
 * show on a light surface. The badge keeps the true tier color behind its black glyph. */
export function SolitaireAchievementList({ profileId }: { profileId: string | null }) {
  const { dark } = useTheme()
  const { stats, unlockedAchievements } = useGameStats()
  const tierAccent = (tierColor: string) => (dark ? tierColor : getBlendedColor('#000000', tierColor, 0.5))
  return (
    <>
      {getAchievementCatalogRows(ACHIEVEMENT_CATALOG, stats, statsViewFor(stats, profileId), unlockedAchievements, profileId).map((row) => (
        <AchievementRow key={row.id} icon={row.icon} title={row.title} description={row.description} badgeColor={row.unlockedAt !== undefined ? row.tierColor : LOCKED_BADGE_COLOR} checkColor={tierAccent(row.tierColor)} unlockedLabel={row.unlockedLabel} progress={row.progress} deviceMarker={row.deviceMarker} />
      ))}
    </>
  )
}

/** Reset follows the player picker (the pack's `resetStats`): one player's (or guest's) stats, achievements and saved
 * games while they are shown, everyone's on Everyone. A player's reset leaves the Everyone totals alone, so the copy
 * says so. */
export const statsReset: PackStatsReset = {
  useReset: () => {
    const { resetAll } = useGameStats()
    const { resetPlayer } = usePlayerData()
    return (profileId) => (profileId ? resetPlayer(profileId) : resetAll())
  },
  labels: (name) => (name !== null ? { label: `Reset ${name}'s Stats`, title: `Reset ${name}?`, body: `Erases ${name}'s stats, achievements and saved games. The totals under Everyone stay. This cannot be undone.` } : { label: 'Reset All Stats', title: 'Reset Everything?', body: "Erases every player's stats, achievements and saved games. This cannot be undone." })
}

const styles = StyleSheet.create({
  // SegmentedButtons' own rounding, so the surface behind it is the same pill.
  boards: {
    borderRadius: 20
  }
})
