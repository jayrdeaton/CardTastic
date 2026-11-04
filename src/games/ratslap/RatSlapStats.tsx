import { StatRow, StatSection } from '@tastic/hud/chrome'
import { useSelector } from 'react-redux'

import { type RatSlapRecord, ratslapStatsFor, totalVsCpu } from '@/redux/ratslapStatsSlice'
import type { RootState } from '@/redux/store'
import { commaString } from '@/utils/commaString'

import { CPU_LEVEL_LABELS } from './cpuLabels'
import { CPU_LEVELS } from './engine/cpu'

const record = ({ played, won, lost }: RatSlapRecord) => (played === 0 ? '-' : `${commaString(won)} won, ${commaString(lost)} lost`)

/** RatSlap's well on the Stats tab (its `StatsSections`): the picked player's matches against the CPU at each level and
 * against people, and their slaps; Everyone (null) is the phone's, where a match between two people is just played. It
 * names itself, since the stats screen puts no game name over a game's sections (the pack's statsGameTitles). */
export function RatSlapStatsSections({ profileId }: { profileId: string | null }) {
  const state = useSelector((root: RootState) => root.ratslapStats)
  const stats = ratslapStatsFor(state, profileId)
  const vsCpu = totalVsCpu(stats)
  return (
    <StatSection label='RATSLAP'>
      <StatRow label='Against the CPU' value={record(vsCpu)} />
      {CPU_LEVELS.map((level) => (stats.vsCpu[level].played > 0 ? <StatRow key={level} label={`CPU, ${CPU_LEVEL_LABELS[level]}`} value={record(stats.vsCpu[level])} /> : null))}
      <StatRow label='Against People' value={profileId === null ? commaString(stats.vsPeople.played) : record(stats.vsPeople)} />
      <StatRow label='Slaps Won' value={commaString(stats.slapsWon)} />
      <StatRow label='Wrong Slaps' value={commaString(stats.wrongSlaps)} />
    </StatSection>
  )
}
