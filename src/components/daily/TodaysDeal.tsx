import { useToast } from '@rific/toaster'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import { GUEST_PLAYER_ID } from '@/constants/player'
import { ordinal } from '@/engine/topWins'
import { type VariantId, variantInfo } from '@/engine/variants'
import type { RootState } from '@/redux/store'
import { fetchDailyBoard, flushDailyDeletions, localDay, sendDailyWin, startDailyDeal, syncDailyLook } from '@/stores/daily'
import { usePlayer } from '@/stores/profiles'
import type { SolitaireGameId } from '@/stores/statsTypes'
import { commaString } from '@/utils/commaString'

import { dailyBoardHref, dailyPlayHref } from './dailyRoutes'
import { DailyRow } from './DailyRow'

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

/**
 * A solitaire game's Daily Deal on its setup screen (games/shared/solitaireLoadout.tsx): playing today's deal, the same shuffle for
 * everyone under the game's default rules, and its board. The server's clock starts with the tap that first deals it and never
 * stops, so playing is always this deliberate tap, never a regular New Game.
 */
export function TodaysDeal({ game }: { game: SolitaireGameId }) {
  const toast = useToast()
  const { profile, profileId, color } = usePlayer()
  const owner = profileId ?? GUEST_PLAYER_ID
  const [day, setDay] = useState(localDay)
  const [busy, setBusy] = useState(false)
  const [wins, setWins] = useState<number | null>(null)
  const deal = useSelector((state: RootState) => state.daily.deals[owner]?.[game])
  const player = useSelector((state: RootState) => state.daily.players[owner])
  const today = deal?.day === day ? deal : null
  const hasPlayer = !!player
  const listed = player?.listed === true
  const tag = profile?.tag ?? ''

  useFocusEffect(
    useCallback(() => {
      let current = true
      const now = localDay()
      setDay(now)
      setWins(null)
      flushDailyDeletions().catch(() => {})
      sendDailyWin(game).catch(() => {})
      if (hasPlayer) {
        syncDailyLook({ tag, color }).catch(() => {})
        fetchDailyBoard(game, now)
          .then((board) => {
            if (current) setWins(board.finished)
          })
          .catch(() => {})
      }
      return () => {
        current = false
      }
    }, [game, hasPlayer, tag, color])
  )

  async function play() {
    setBusy(true)
    try {
      const started = await startDailyDeal(game)
      if (!started.result) router.push(dailyPlayHref(game, started.day))
    } catch (error) {
      toast.info(errorText(error), undefined, undefined, { icon: 'wifi-off' })
    } finally {
      setBusy(false)
    }
  }

  const rules = variantInfo(game as VariantId).label
  const result = today?.result
  let caption = [rules, 'Clock starts on tap'].filter(Boolean).join(' · ')
  if (busy) caption = 'Dealing'
  else if (result) caption = `${listed ? '' : 'Would be '}${ordinal(result.rank)} today · Score ${commaString(result.score)}`
  else if (today?.unsent) caption = 'Posting your win'
  else if (today?.refused) caption = "This run couldn't be verified"
  else if (today) caption = 'Clock is running'
  const done = !!result || !!today?.unsent || !!today?.refused

  return (
    <View style={styles.rows} testID={`${game}-todays-deal`}>
      <DailyRow icon='calendar-star' label="Today's Deal" caption={caption} disabled={busy} onPress={done ? undefined : () => void play()} trailing={done ? undefined : 'play'} testID={`${game}-daily-play`} />
      <DailyRow icon='podium' label="Today's Board" caption={wins === null ? 'See who is ahead' : wins === 1 ? '1 win posted' : `${commaString(wins)} wins posted`} onPress={() => router.push(dailyBoardHref(game))} trailing='chevron-right' testID={`${game}-daily-board`} />
    </View>
  )
}

const styles = StyleSheet.create({
  rows: {
    gap: 4
  }
})
