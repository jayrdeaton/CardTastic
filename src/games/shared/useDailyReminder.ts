import { useToast } from '@rific/toaster'
import { router } from 'expo-router'
import { useCallback, useEffect, useSyncExternalStore } from 'react'

import { dailyPlayHref } from '@/components/daily/dailyRoutes'
import { useLocalDay } from '@/components/daily/useLocalDay'
import { dailyActions, type DailyState } from '@/redux/dailySlice'
import { store } from '@/redux/store'
import { dailyErrorText, startDailyDeal } from '@/stores/daily'
import { flushGameInProgress } from '@/stores/gameInProgress'
import { GAME_TITLES, type SolitaireGameId } from '@/stores/statsTypes'

/** How long a regular game's screen is up before it says a new Daily is out: past its deal, so the toast isn't lost in it. */
export const DAILY_REMINDER_DELAY_MS = 1500

// What the reminder reads, each optional: a screen test's store has none of it (testUtils/gameInProgressStore.ts)
type ReminderState = { daily?: DailyState; profileSelection?: Record<1, string | null> }

// Whether to say it, read from the app's store as stores/daily.ts reads it (a play screen is under no Provider of its own in a
// screen test): a profile that plays the Dailies, today's not started in the game, and not said yet today. Null when not.
function pendingReminder(game: SolitaireGameId, day: string): string | null {
  const state = store.getState() as ReminderState
  const owner = state.profileSelection?.[1] ?? null
  const daily = state.daily
  if (!owner || !daily?.players[owner]) return null
  if (daily.deals[owner]?.[game]?.day === day || daily.reminded?.[owner]?.[game] === day) return null
  return owner
}

/**
 * Says a game's new Daily Deal is out (Jay, 2026-11-21), on a regular game's screen of that game, once a day: a toast that, tapped,
 * deals the Daily and puts its screen in place of this one. The regular game isn't lost: it's saved as the screen goes, as when
 * backing out, and comes back with CONTINUE on the setup screen. Only for a profile that plays the Dailies (it has a player on the
 * server: a guest never has, and needs a name first), and never once today's Daily of the game is started. `enabled` is false on a
 * Daily's own screen.
 */
export function useDailyReminder(game: SolitaireGameId, enabled: boolean) {
  const toast = useToast()
  const day = useLocalDay()
  const owner = useSyncExternalStore(
    store.subscribe,
    useCallback(() => pendingReminder(game, day), [game, day])
  )

  useEffect(() => {
    if (!enabled || !owner) return
    const timer = setTimeout(() => {
      store.dispatch(dailyActions.reminded({ owner, game, day }))
      toast.info(`New ${GAME_TITLES[game]} Daily Deal`, 'Tap to play it. This game stays saved.', undefined, {
        icon: 'calendar-star',
        onPress: () => {
          startDailyDeal(game)
            .then(async (deal) => {
              // This game's last moves saved under it before the Daily's screen takes over
              await flushGameInProgress(game)
              if (!deal.result) router.replace(dailyPlayHref(game, deal.day))
            })
            .catch((error) => toast.info(dailyErrorText(error), undefined, undefined, { icon: 'wifi-off' }))
        }
      })
    }, DAILY_REMINDER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [enabled, owner, game, day, toast])
}
