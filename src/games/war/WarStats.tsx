import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** War's well on the Stats tab: the matches (its CPU has no levels) and the battles won in them. */
export function WarStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='war' label='WAR' profileId={profileId} levels={false}>
      {(stats) => <StatRow label='Battles Won' value={commaString(stats.counts.battlesWon ?? 0)} />}
    </MatchStatsSection>
  )
}
