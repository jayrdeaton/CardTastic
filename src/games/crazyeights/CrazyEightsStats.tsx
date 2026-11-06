import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Crazy Eights' well on the Stats tab: the games, and the 8s played in them. */
export function CrazyEightsStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='crazyeights' label='CRAZY EIGHTS' profileId={profileId}>
      {(stats) => <StatRow label='Eights Played' value={commaString(stats.counts.eights ?? 0)} />}
    </MatchStatsSection>
  )
}
