import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { overlayActionStyles, useOverlayCardColors } from '@tastic/hud/chrome'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { GUEST_PLAYER_ID } from '@/constants/player'
import { ordinal } from '@/engine/topWins'
import type { RootState } from '@/redux/store'
import { sendDailyWin, setDailyListed } from '@/stores/daily'
import { usePlayer } from '@/stores/profiles'
import type { SolitaireGameId } from '@/stores/statsTypes'

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

/**
 * The win card's Daily Deal lines: where the win stands today, and, the first time a profile wins one, whether to show on the public
 * boards (Jay, 2026-11-18). The win is on the server already, unseen (players.listed), so the question costs no time on the clock.
 * Guest plays the Daily but never shows.
 */
export function DailyWinSection({ game }: { game: SolitaireGameId }) {
  const { colors } = useAutoPaperTheme()
  const { fg, fgMuted } = useOverlayCardColors()
  const { profile, profileId, color } = usePlayer()
  const owner = profileId ?? GUEST_PLAYER_ID
  const deal = useSelector((state: RootState) => state.daily.deals[owner]?.[game])
  const player = useSelector((state: RootState) => state.daily.players[owner])
  const [busy, setBusy] = useState(false)
  const [unreachable, setUnreachable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsent = !!deal?.unsent

  // By the time this card shows the win has usually landed. If it hasn't, it's sent again (the server takes it once)
  useEffect(() => {
    if (!unsent) return
    sendDailyWin(game).catch(() => setUnreachable(true))
  }, [game, unsent])

  async function answer(listed: boolean) {
    setBusy(true)
    setError(null)
    try {
      await setDailyListed(listed, { tag: profile?.tag ?? '', color })
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setBusy(false)
    }
  }

  async function retry() {
    setBusy(true)
    setUnreachable(false)
    await sendDailyWin(game).catch(() => setUnreachable(true))
    setBusy(false)
  }

  if (!deal) return null
  const line = (text: string, muted = false) => (
    <Text variant={muted ? 'bodySmall' : 'titleSmall'} style={[styles.center, { color: muted ? fgMuted : fg }]} testID='daily-win-line'>
      {text}
    </Text>
  )
  if (deal.refused) return line("This run couldn't be verified, so it isn't on the board", true)
  if (!deal.result)
    return unreachable ? (
      <View style={styles.section}>
        {line("Couldn't reach the board", true)}
        <Button mode='text' onPress={() => void retry()} disabled={busy} textColor={colors.primary} testID='daily-win-retry'>
          Try Again
        </Button>
      </View>
    ) : (
      line('Posting your win', true)
    )

  const listed = player?.listed === true
  const asking = !!profileId && player?.listed === null
  return (
    <View style={styles.section}>
      {line(`${listed ? '' : "You'd be "}${ordinal(deal.result.rank)} today`)}
      {asking && (
        <>
          {line("Show on today's public board? Everyone will see your tag and color.", true)}
          <View style={overlayActionStyles.actions}>
            <Button mode='outlined' onPress={() => void answer(false)} disabled={busy} style={overlayActionStyles.actionButton} textColor={colors.primary} testID='daily-list-no'>
              Not Now
            </Button>
            <Button mode='contained' onPress={() => void answer(true)} disabled={busy} style={overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary} testID='daily-list-yes'>
              Show Me
            </Button>
          </View>
        </>
      )}
      {error && line(error, true)}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center'
  },
  section: {
    alignItems: 'stretch',
    gap: 8,
    width: '100%'
  }
})
