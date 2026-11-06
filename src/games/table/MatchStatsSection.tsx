import { StatRow, StatSection } from '@tastic/hud/chrome'
import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { type MatchGameId, type MatchPlayerStats, type MatchRecord, matchStatsFor, totalVsCpu } from '@/redux/matchStatsSlice'
import type { RootState } from '@/redux/store'
import { commaString } from '@/utils/commaString'

import { CPU_LEVEL_LABELS, CPU_LEVELS } from './cpuLevel'

const record = ({ played, won, lost, tied }: MatchRecord) => (played === 0 ? '-' : `${commaString(won)} won, ${commaString(lost)} lost${tied > 0 ? `, ${commaString(tied)} tied` : ''}`)

/** A two-player game's well on the Stats tab (its `StatsSections`): the picked player's matches against the CPU at each
 * level and against people, then the game's own rows; Everyone (null) is the phone's, where a match between two people
 * is just played. It names itself, since the stats screen puts no game name over a game's sections (the pack's
 * statsGameTitles). */
export function MatchStatsSection({ game, label, profileId, levels = true, children }: { game: MatchGameId; label: string; profileId: string | null; /** False for a game whose CPU has no levels (War). */ levels?: boolean; children?: (stats: MatchPlayerStats) => ReactNode }) {
  const state = useSelector((root: RootState) => root.matchStats)
  const stats = matchStatsFor(state, game, profileId)
  return (
    <StatSection label={label}>
      <StatRow label='Against the CPU' value={record(totalVsCpu(stats))} />
      {CPU_LEVELS.map((level) => (levels && stats.vsCpu[level].played > 0 ? <StatRow key={level} label={`CPU, ${CPU_LEVEL_LABELS[level]}`} value={record(stats.vsCpu[level])} /> : null))}
      <StatRow label='Against People' value={profileId === null ? commaString(stats.vsPeople.played) : record(stats.vsPeople)} />
      {children?.(stats)}
    </StatSection>
  )
}
