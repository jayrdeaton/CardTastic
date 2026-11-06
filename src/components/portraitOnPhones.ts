import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { Dimensions, Platform } from 'react-native'

// A screen whose shorter side is under this is a phone. The largest iPhone's is 440pt and the smallest iPad's (mini)
// 744pt; an unfolded Android foldable counts as a tablet, as the plan for the OS turning it has it.
const PHONE_MAX_SHORT_SIDE = 600

/** A phone, not a tablet or the web. Read from the screen, which never changes while the app runs. */
export function isPhone(): boolean {
  if (Platform.OS === 'web') return false
  const { width, height } = Dimensions.get('screen')
  return Math.min(width, height) < PHONE_MAX_SHORT_SIDE
}

// How many mounted screens hold portrait. A two-player game's setup screen stays mounted under its play screen, so the
// lock is let go only when the last of them leaves.
let holders = 0

/**
 * Holds a phone upright while `active` (2026-11-06, the plan for the OS turning CardTastic): the two-player tables are
 * laid out for a portrait phone, and one lying flat between two players must not turn when someone leans on it. Every
 * other screen follows the OS. Tablets and the web follow the window, as the tables do on a wide desktop browser.
 * Opening one of these screens with the phone held sideways turns it upright.
 */
export function usePortraitOnPhones(active = true): void {
  useEffect(() => {
    if (!active || !isPhone()) return
    holders += 1
    if (holders === 1) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})
    return () => {
      holders -= 1
      if (holders === 0) ScreenOrientation.unlockAsync().catch(() => {})
    }
  }, [active])
}
