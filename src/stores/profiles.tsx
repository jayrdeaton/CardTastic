import { type Profile, profileSeatColor } from '@tastic/profile'
import { profileSelectionActions, seatColorsActions, useProfiles } from '@tastic/shell'
import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Action, Dispatch } from 'redux'

import type { RootState } from '@/redux/store'

// The roster and its edits (create, update, delete) are @tastic/shell's: the App Group reconcile and sync, and the
// self-heal when a sibling app deleted the selected profile (pruneToRoster). Re-exported so the screens that edit
// the roster (Home's player button, Profiles, the Stats screen's picker) keep reading it from here. The provider is the
// shell's RootLayout's, which holds everything below it (and the 'profiles' splash gate) until the roster has been
// reconciled against the shared App Group store, so nothing downstream - PlayingCard's and HeroCards' tag, theme.ts's
// useTableColors() - can lock onto the pre-reconciliation snapshot or a selection the self-heal is about to drop.
export { useProfiles }

/** Who is playing: Solitaire has one player at a time, seat 1 of the shell's `profileSelection`. */
export interface Player {
  // The selected profile's id, or null for Guest.
  profileId: string | null
  profile: Profile | null
  // The seed color in effect (the card back, the felt and the Paper theme follow it): the selected profile's pick in
  // Solitaire, else its own color; Guest's pick, else DEFAULT_SEED_COLOR (the shell's seatColors, seeded from the
  // pack's SEAT_COLORS).
  color: string
  // Saves `hex` as the player's pick, kept across relaunches. A profile's own color drops its pick, so it follows
  // that color again (and so does a new color for the profile itself; @tastic/profile's seatColors).
  setColor: (hex: string) => void
  // Picks a profile, or Guest (null).
  select: (profileId: string | null) => void
}

// A profile the roster still has unchanged, even as a new object (the shell replaces the whole roster on every
// foreground resume): every card reads the player, so an unchanged one mustn't re-render them.
const sameProfile = (a: Profile | null, b: Profile | null) => a === b || (!!a && !!b && a.id === b.id && a.name === b.name && a.color === b.color && a.tag === b.tag)

const selectProfile = (state: RootState) => state.profiles.find((p) => p.id === state.profileSelection[1]) ?? null

// The color in effect for seat 1: its profile's pick, else its own color; Guest's for no selection or an id the roster
// doesn't have (the self-heal drops one of those).
function selectColor(state: RootState): string {
  const profile = selectProfile(state)
  return profile ? profileSeatColor(profile, state.seatColors.profileColors) : state.seatColors.lastGuestColor[1]
}

/** The player in seat 1, over the shell's profileSelection and seatColors. Read through selectors, not the shell's
 * profiles context, so a roster replaced with the same profiles re-renders nothing. */
export function usePlayer(): Player {
  // Typed explicitly because @tastic/profile's action creators return a plain `{ payload, type }` interface with no
  // index signature, which react-redux's default Dispatch<UnknownAction> rejects.
  const dispatch = useDispatch<Dispatch<Action>>()
  const profileId = useSelector((state: RootState) => state.profileSelection[1])
  const profile = useSelector(selectProfile, sameProfile)
  const color = useSelector(selectColor)

  const setColor = useCallback(
    (hex: string) => {
      if (profile) dispatch(seatColorsActions.setProfileColor({ profile, color: hex }))
      else dispatch(seatColorsActions.setLastGuestColor({ seat: 1, color: hex }))
    },
    [dispatch, profile]
  )
  const select = useCallback((id: string | null) => dispatch(profileSelectionActions.select({ seat: 1, profileId: id })), [dispatch])

  return useMemo(() => ({ profileId, profile, color, setColor, select }), [profileId, profile, color, setColor, select])
}
