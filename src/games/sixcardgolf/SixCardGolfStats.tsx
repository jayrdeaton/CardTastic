import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Six-Card Golf's well on the Stats tab: the matches, the holes played and the lowest hole ever. */
export function SixCardGolfStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='sixcardgolf' label='SIX-CARD GOLF' profileId={profileId}>
      {(stats) => (
        <>
          <StatRow label='Holes Played' value={commaString(stats.counts.holes ?? 0)} />
          <StatRow label='Best Hole' value={stats.lows.bestHole === undefined ? '-' : String(stats.lows.bestHole)} />
        </>
      )}
    </MatchStatsSection>
  )
}
