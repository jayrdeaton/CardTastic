import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Gin Rummy's well on the Stats tab: the matches, and the hands won, gins and undercuts in them. */
export function GinRummyStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='ginrummy' label='GIN RUMMY' profileId={profileId}>
      {(stats) => (
        <>
          <StatRow label='Hands Won' value={commaString(stats.counts.hands ?? 0)} />
          <StatRow label='Gins' value={commaString(stats.counts.gins ?? 0)} />
          <StatRow label='Undercuts' value={commaString(stats.counts.undercuts ?? 0)} />
        </>
      )}
    </MatchStatsSection>
  )
}
