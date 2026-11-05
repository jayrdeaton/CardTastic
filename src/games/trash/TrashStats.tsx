import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** Trash's well on the Stats tab: the matches, and the rounds won in them. */
export function TrashStatsSections({ profileId }: { profileId: string | null }) {
  return (
    <MatchStatsSection game='trash' label='TRASH' profileId={profileId}>
      {(stats) => <StatRow label='Rounds Won' value={commaString(stats.counts.rounds ?? 0)} />}
    </MatchStatsSection>
  )
}
