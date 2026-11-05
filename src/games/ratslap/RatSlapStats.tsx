import { StatRow } from '@tastic/hud/chrome'

import { MatchStatsSection } from '@/games/table/MatchStatsSection'
import { commaString } from '@/utils/commaString'

/** RatSlap's well on the Stats tab, and Slapjack's (the same table and the same tallies): the matches, then the slaps
 * that won a pile and the wrong ones. */
export function SlapStatsSection({ game, label, profileId }: { game: 'ratslap' | 'slapjack'; label: string; profileId: string | null }) {
  return (
    <MatchStatsSection game={game} label={label} profileId={profileId}>
      {(stats) => (
        <>
          <StatRow label='Slaps Won' value={commaString(stats.counts.slapsWon ?? 0)} />
          <StatRow label='Wrong Slaps' value={commaString(stats.counts.wrongSlaps ?? 0)} />
        </>
      )}
    </MatchStatsSection>
  )
}

export function RatSlapStatsSections({ profileId }: { profileId: string | null }) {
  return <SlapStatsSection game='ratslap' label='RATSLAP' profileId={profileId} />
}
