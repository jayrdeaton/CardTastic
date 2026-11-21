import { useToast } from '@rific/toaster'
import { OnlineDataSection as Section } from '@tastic/profile/online'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import { SettingsSection } from '@/components/SettingsSection'
import type { RootState } from '@/redux/store'
import { dailyErrorText, setDailyListed } from '@/stores/daily'
import { online } from '@/stores/online'
import { usePlayer } from '@/stores/profiles'

import { DailyRow } from './DailyRow'

/** The Settings sheet's Daily row, once this profile has played one: whether they show on the public boards. */
export function DailySettingsSection() {
  const toast = useToast()
  const { profile, profileId, color } = usePlayer()
  const player = useSelector((state: RootState) => (profileId ? state.daily.players[profileId] : undefined))
  const [busy, setBusy] = useState(false)
  if (!player) return null
  const listed = player.listed === true

  async function toggle() {
    setBusy(true)
    try {
      await setDailyListed(!listed, { tag: profile?.tag ?? '', color })
    } catch (error) {
      toast.info(dailyErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection label='DAILY DEALS'>
      <View style={styles.rows}>
        <DailyRow icon={listed ? 'eye-outline' : 'eye-off-outline'} active={listed} label='Show on Public Boards' caption={listed ? 'Tag and color are visible' : 'Hidden from everyone'} disabled={busy} onPress={() => void toggle()} testID='daily-listed' />
      </View>
    </SettingsSection>
  )
}

/** Settings' ONLINE section, once a profile on this device has played a Daily (@tastic/profile/online's, the same as every Tastic
 * game's): Delete Online Data, for every profile on the device, deleting their players from the server with their Daily wins. A single
 * profile's goes with the profile when it's deleted. Apple requires an account made in the app to be deletable in it (guideline
 * 5.1.1(v)), and the anonymous player is one. */
export function OnlineSection() {
  const toast = useToast()
  return <Section online={online} confirmMessage="Your profiles' Daily Deal wins come off every board, and their players are deleted from the server. Today's deals start over. This can't be undone." onDeleted={() => toast.success('Online data deleted')} onError={(message) => toast.error('Online', message)} />
}

const styles = StyleSheet.create({
  rows: {
    gap: 4
  }
})
