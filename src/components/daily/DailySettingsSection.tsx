import { useToast } from '@rific/toaster'
import { ConfirmDialog } from '@tastic/hud/chrome'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import { SettingsSection } from '@/components/SettingsSection'
import { GUEST_PLAYER_ID } from '@/constants/player'
import type { RootState } from '@/redux/store'
import { deleteDailyData, setDailyListed } from '@/stores/daily'
import { usePlayer } from '@/stores/profiles'

import { DailyRow } from './DailyRow'

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

/** The Settings sheet's Daily rows, once this player has played one: showing on the public boards, and deleting what the server has. */
export function DailySettingsSection() {
  const toast = useToast()
  const { profile, profileId, color } = usePlayer()
  const owner = profileId ?? GUEST_PLAYER_ID
  const player = useSelector((state: RootState) => state.daily.players[owner])
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  if (!player) return null
  const listed = player.listed === true

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.info(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection label='DAILY DEALS'>
      <View style={styles.rows}>
        {profileId && <DailyRow icon={listed ? 'eye-outline' : 'eye-off-outline'} active={listed} label='Show on Public Boards' caption={listed ? 'Tag and color are visible' : 'Hidden from everyone'} disabled={busy} onPress={() => void run(() => setDailyListed(!listed, { tag: profile?.tag ?? '', color }))} testID='daily-listed' />}
        <DailyRow icon='delete-outline' active={false} label='Delete Daily Scores' caption='Remove them from the server' disabled={busy} onPress={() => setConfirming(true)} testID='daily-delete' />
      </View>
      <ConfirmDialog
        visible={confirming}
        title='Delete Daily Scores?'
        message="This player's Daily wins come off every board, and today's deals start over."
        confirmLabel='Delete'
        cancelLabel='Cancel'
        icon='alert-outline'
        destructive
        onConfirm={() => {
          setConfirming(false)
          void run(deleteDailyData)
        }}
        onCancel={() => setConfirming(false)}
      />
    </SettingsSection>
  )
}

const styles = StyleSheet.create({
  rows: {
    gap: 4
  }
})
