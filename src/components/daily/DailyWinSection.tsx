import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { overlayActionStyles, SecondaryButton, useOverlayCardColors } from '@tastic/hud/chrome'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { formatDay } from '@/components/PlayCalendar'
import { ordinal } from '@/engine/topWins'
import type { RootState } from '@/redux/store'
import { dailyErrorText, localDay, sendDailyWin, setDailyListed } from '@/stores/daily'
import { usePlayer } from '@/stores/profiles'
import type { SolitaireGameId } from '@/stores/statsTypes'

/** Where a Daily's win stands, on the day it was dealt: today's, or an earlier date's for a deal finished after midnight
 * (a Daily belongs to the date its clock started). */
export function dailyPlace(rank: number, listed: boolean, day: string, today: string = localDay()): string {
  const when = day === today ? 'today' : `on ${formatDay(day, new Date())}`
  return `${listed ? '' : "You'd be "}${ordinal(rank)} ${when}`
}

/**
 * The win card's Daily Deal part: where the win stands, and the card's buttons. The first time a profile wins one it asks whether
 * their wins show on the public boards (Jay, 2026-11-18). The win is on the server already, unseen (players.listed), so the question
 * costs no time on the clock. Every row of buttons is the dialogs' one (Jay, 2026-11-21): one filled button in the theme's primary,
 * and a muted one (hud's SecondaryButton, never the primary, which on a yellow theme was hard to read as an outline). Asking, the
 * question's own buttons are the card's: Keep Private and Show My Wins (it was Not Now and Show Me, which read as "show me the
 * board"), then See Board once it's answered. A Daily is always a profile's (stores/online.ts).
 */
export function DailyWinSection({ game, onSeeBoard }: { game: SolitaireGameId; onSeeBoard: () => void }) {
  const { colors } = useAutoPaperTheme()
  const { fg, fgMuted } = useOverlayCardColors()
  const { profile, profileId, color } = usePlayer()
  const deal = useSelector((state: RootState) => (profileId ? state.daily.deals[profileId]?.[game] : undefined))
  const player = useSelector((state: RootState) => (profileId ? state.daily.players[profileId] : undefined))
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
      setError(dailyErrorText(failure))
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

  const line = (text: string, muted = false) => (
    <Text variant={muted ? 'bodySmall' : 'titleSmall'} style={[styles.center, { color: muted ? fgMuted : fg }]} testID='daily-win-line'>
      {text}
    </Text>
  )
  const primary = (label: string, onPress: () => void, testID: string, single = false) => (
    <Button mode='contained' onPress={onPress} disabled={busy} style={single ? overlayActionStyles.actionButtonSingle : overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary} testID={testID}>
      {label}
    </Button>
  )
  const seeBoard = (single: boolean) => primary('See Board', onSeeBoard, 'win-see-board', single)

  const result = deal?.result
  const asking = !!result && !!profileId && player?.listed === null
  const listed = player?.listed === true

  let lines = null
  let actions = seeBoard(true)
  if (deal?.refused) lines = line("This run couldn't be verified, so it isn't on the board", true)
  else if (deal && !result && unreachable) {
    lines = line("Couldn't reach the board", true)
    actions = (
      <>
        <SecondaryButton onPress={() => void retry()} disabled={busy} testID='daily-win-retry'>
          Try Again
        </SecondaryButton>
        {seeBoard(false)}
      </>
    )
  } else if (deal && !result) lines = line('Posting your win', true)
  else if (deal && result) {
    lines = (
      <>
        {line(dailyPlace(result.rank, listed, deal.day))}
        {asking && line('Show your Daily wins on the public boards? Everyone will see your tag and color.', true)}
      </>
    )
    if (asking)
      actions = (
        <>
          <SecondaryButton onPress={() => void answer(false)} disabled={busy} testID='daily-list-no'>
            Keep Private
          </SecondaryButton>
          {primary('Show My Wins', () => void answer(true), 'daily-list-yes')}
        </>
      )
  }

  return (
    <>
      {(lines || error) && (
        <View style={styles.section}>
          {lines}
          {error && line(error, true)}
        </View>
      )}
      <View style={overlayActionStyles.actions}>{actions}</View>
    </>
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
