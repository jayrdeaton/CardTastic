import { useToast } from '@rific/toaster'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { ordinal } from '@/engine/topWins'
import { type VariantId, variantInfo } from '@/engine/variants'
import type { RootState } from '@/redux/store'
import { dailyErrorText, fetchDailyBoard, sendDailyWin, startDailyDeal, syncDailyLook } from '@/stores/daily'
import { usePlayer, useProfiles } from '@/stores/profiles'
import type { SolitaireGameId } from '@/stores/statsTypes'
import { commaString } from '@/utils/commaString'

import { dailyBoardHref, dailyPlayHref } from './dailyRoutes'
import { DailyRow } from './DailyRow'
import { NamePrompt, tagOfName } from './NamePrompt'

/**
 * A solitaire game's Daily Deal on its setup screen (games/shared/SolitaireSetup.tsx): playing today's deal, the same shuffle for
 * everyone under the game's default rules, and its board. The server's clock starts with the tap that first deals it and never
 * stops, so playing is always this deliberate tap, never a regular New Game. A Daily is always a profile's (stores/online.ts): a guest
 * tapping either row is asked their name first, and a profile made from it in their color is picked (Jay, 2026-11-20). Once won it's
 * checked off (Jay, 2026-11-21: it didn't look done), with where it stands; it can't be played again. `day` is today
 * (useLocalDay), the date the section above it shows.
 */
export function TodaysDeal({ game, day }: { game: SolitaireGameId; day: string }) {
  const toast = useToast()
  const { profile, profileId, color, select } = usePlayer()
  const { createProfile } = useProfiles()
  // What a guest was about to do when asked their name
  const [naming, setNaming] = useState<'play' | 'board' | null>(null)
  const [busy, setBusy] = useState(false)
  const [wins, setWins] = useState<number | null>(null)
  const deal = useSelector((state: RootState) => (profileId ? state.daily.deals[profileId]?.[game] : undefined))
  const player = useSelector((state: RootState) => (profileId ? state.daily.players[profileId] : undefined))
  const today = deal?.day === day ? deal : null
  const hasPlayer = !!player
  const listed = player?.listed === true
  const tag = profile?.tag ?? ''

  useFocusEffect(
    useCallback(() => {
      let current = true
      setWins(null)
      sendDailyWin(game).catch(() => {})
      if (hasPlayer) {
        syncDailyLook({ tag, color }).catch(() => {})
        fetchDailyBoard(game, day)
          .then((board) => {
            if (current) setWins(board.finished)
          })
          .catch(() => {})
      }
      return () => {
        current = false
      }
    }, [game, day, hasPlayer, tag, color])
  )

  async function play() {
    if (!profileId) {
      setNaming('play')
      return
    }
    await startDeal()
  }

  function openBoard() {
    if (!profileId) setNaming('board')
    else router.push(dailyBoardHref(game))
  }

  // A guest's name: a profile in their own color, its first letter the tag, picked as the player before anything goes online
  function named(name: string) {
    const next = naming
    setNaming(null)
    const made = createProfile({ name, color, tag: tagOfName(name) })
    select(made.id)
    if (next === 'play') void startDeal()
    else router.push(dailyBoardHref(game))
  }

  async function startDeal() {
    setBusy(true)
    try {
      const started = await startDailyDeal(game)
      if (!started.result) router.push(dailyPlayHref(game, started.day))
    } catch (error) {
      toast.info(dailyErrorText(error), undefined, undefined, { icon: 'wifi-off' })
    } finally {
      setBusy(false)
    }
  }

  const rules = variantInfo(game as VariantId).label
  const result = today?.result
  let caption = [rules, 'Clock starts on tap'].filter(Boolean).join(' · ')
  if (busy) caption = 'Dealing'
  else if (result) caption = `Done · ${listed ? '' : "You'd be "}${ordinal(result.rank)} · Score ${commaString(result.score)}`
  else if (today?.unsent) caption = 'Won · Posting your win'
  else if (today?.refused) caption = "Won · This run couldn't be verified"
  else if (today) caption = 'Clock is running'
  // Finished: there's no playing it again (the server keeps one run a player)
  const finished = !!result || !!today?.unsent || !!today?.refused

  return (
    <View testID={`${game}-todays-deal`}>
      <DailyRow icon='calendar-star' label="Today's Deal" caption={caption} disabled={busy} done={finished} onPress={finished ? undefined : () => void play()} trailing={finished ? undefined : 'play'} testID={`${game}-daily-play`} />
      <DailyRow icon='podium' label="Today's Board" caption={wins === null ? 'See who is ahead' : wins === 1 ? '1 win posted' : `${commaString(wins)} wins posted`} onPress={openBoard} trailing='chevron-right' testID={`${game}-daily-board`} />
      <NamePrompt visible={naming !== null} confirmLabel={naming === 'board' ? 'Continue' : 'Play'} onDone={named} onCancel={() => setNaming(null)} />
    </View>
  )
}
