import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Speed's well on the Stats tab: the matches, and every card played in them. */
export function SpeedStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='speed' label='SPEED' profileId={profileId}>
      {(stats) => <StatRow label='Cards Played' value={commaString(stats.counts.cardsPlayed ?? 0)} />}
    </MatchStatsSection>
  )
}
