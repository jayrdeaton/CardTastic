import { useToast } from '@rific/toaster'
import { EditProfileRow, type Profile, profileSeatColor } from '@tastic/profile'
import { ProfileOnlineSection } from '@tastic/profile/online'
import { useState } from 'react'
import { useSelector } from 'react-redux'

import type { RootState } from '@/redux/store'
import { dailyErrorText, setDailyListed } from '@/stores/daily'
import { online } from '@/stores/online'

/** Whether this profile's Daily wins show on the public boards, once it has played a Daily: its tag and its color in CardTastic (the
 * pick it plays under, else its own) go up with a yes. For any profile, from its own Edit Profile screen. */
function DailyListedRow({ profile }: { profile: Profile }) {
  const toast = useToast()
  const player = useSelector((state: RootState) => state.daily.players[profile.id])
  const color = useSelector((state: RootState) => profileSeatColor(profile, state.seatColors.profileColors))
  const [busy, setBusy] = useState(false)
  if (!player) return null
  const listed = player.listed === true

  async function toggle() {
    setBusy(true)
    try {
      await setDailyListed(!listed, { tag: profile.tag, color }, profile.id)
    } catch (error) {
      toast.info(dailyErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return <EditProfileRow icon={listed ? 'eye-outline' : 'eye-off-outline'} tone={listed ? 'on' : 'off'} label='Show on Public Boards' caption={listed ? 'Tag and color are visible' : 'Hidden from everyone'} disabled={busy} onPress={() => void toggle()} testID='daily-listed' />
}

/** A profile's ONLINE section on its Edit Profile screen (the pack's `ProfileSections`; @tastic/profile/online's, the same as every
 * Tastic game's), once it has played a Daily: whether it shows on the public boards, then Delete Online Data, which deletes its player
 * from the server with its Daily wins and keeps the profile (Jay, 2026-11-20: what's online about a person is on their own page).
 * Deleting the profile deletes its player too (stores/online.ts' sync). Apple requires an account made in the app to be deletable in it
 * (guideline 5.1.1(v)), and the anonymous player is one. */
export function ProfileOnline({ profile }: { profile: Profile }) {
  const toast = useToast()
  return (
    <ProfileOnlineSection online={online} profile={profile} confirmMessage={`${profile.name}'s Daily Deal wins come off every board, and their player is deleted from the server. The profile stays, and today's deals start over. This can't be undone.`} onDeleted={() => toast.success('Online data deleted')} onError={(message) => toast.error('Online', message)}>
      <DailyListedRow profile={profile} />
    </ProfileOnlineSection>
  )
}
