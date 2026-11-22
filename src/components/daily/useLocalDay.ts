import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { localDay } from '@/stores/daily'

/** How often a screen that shows today's Daily looks for midnight. */
const DAY_CHECK_MS = 60_000

/**
 * Today, by the player's own calendar, kept current while a screen that shows today's Daily is up: read again whenever the
 * screen comes back into focus, the app comes back to the foreground, and once a minute (so a setup screen left open past
 * midnight turns over to the new day's deal). A Daily belongs to the date its clock started (Jay, 2026-11-21: midnight, not
 * a later rollover), so the screens say which date that is.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(localDay)
  useFocusEffect(useCallback(() => setDay(localDay()), []))
  useEffect(() => {
    const check = () => setDay(localDay())
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check()
    })
    const timer = setInterval(check, DAY_CHECK_MS)
    return () => {
      subscription.remove()
      clearInterval(timer)
    }
  }, [])
  return day
}
