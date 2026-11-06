import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Four Crowns' well on the Stats tab: the matches, the rounds gone out first, and the best (lowest) total. */
export function FourCrownsStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='fourcrowns' label='FOUR CROWNS' profileId={profileId}>
      {(stats) => (
        <>
          <StatRow label='Rounds Gone Out' value={commaString(stats.counts.outs ?? 0)} />
          <StatRow label='Best Total' value={stats.lows.bestTotal === undefined ? '-' : commaString(stats.lows.bestTotal)} />
        </>
      )}
    </MatchStatsSection>
  )
}
