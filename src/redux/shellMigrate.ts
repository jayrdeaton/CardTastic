import type { ViewRotation } from '@tastic/core'
import type { Profile, ProfileColorPick } from '@tastic/profile'
import type { AppSettings, ProfileSelectionState, SeatColorsState } from '@tastic/shell'
import type { PersistedState } from 'redux-persist'

import type { LegacySettingsLock } from '@/types'

import type { ActiveProfileState } from './activeProfileSlice'
import type { TableColorState } from './tableColorSlice'

type Migrate = (state: PersistedState, version: number) => Promise<PersistedState>

// What a 1.2.8 `solitaire:root` holds that moves, read defensively: it's whatever was on disk.
interface SavedRoot {
  activeProfile?: ActiveProfileState
  tableColor?: Partial<TableColorState> | null
  settings?: LegacySettingsLock | null
  profiles?: unknown
  profileSelection?: ProfileSelectionState
  seatColors?: SeatColorsState
  appSettings?: AppSettings
}

/** A saved root from before the CardTastic move: it has Solitaire's own player keys and not yet the shell's. */
export function needsShellReshape(state: object): boolean {
  return !('profileSelection' in state) && ('activeProfile' in state || 'tableColor' in state)
}

const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// tableColor kept a profile's pick as a bare color; the shell's seatColors keeps it beside the profile's own color at
// the time (@tastic/profile's ProfileColorPick), so a new color for the profile drops it. That color comes from the
// saved roster. A pick for a profile the roster no longer has (deleted in a sibling app) had no effect and is dropped,
// and so is one that equals the profile's own color, which seatColors never keeps.
function picksFor(saved: TableColorState['profileColors'], profiles: unknown): Record<string, ProfileColorPick> {
  const roster = Array.isArray(profiles) ? (profiles as Partial<Profile>[]) : []
  const picks: Record<string, ProfileColorPick> = {}
  for (const [id, color] of Object.entries(saved ?? {})) {
    const profileColor = roster.find((p) => p?.id === id)?.color
    if (typeof color === 'string' && typeof profileColor === 'string' && !sameColor(color, profileColor)) picks[id] = { color, profileColor }
  }
  return picks
}

/**
 * Reshapes a 1.2.8 save for @tastic/shell, in place under the same `solitaire:` prefix (Decisions for Jay 1 in
 * TODO.md's CardTastic plan): `activeProfile` becomes seat 1 of `profileSelection`, `tableColor` becomes `seatColors`
 * (guest's pick as seat 1's guest color, each profile's pick by id), and Lock Orientation with its angle is copied
 * from `settings` into `appSettings`. The old keys stay as they are (Jay, 2026-10-29: for one release, so an OTA
 * rolled back to 1.2.8 finds each player, color pick and lock as they were at the move; activeProfileSlice.ts and
 * tableColorSlice.ts only keep what they rehydrate). There's no persist version, so this runs on every launch and
 * acts only while the save has Solitaire's keys and not the shell's (needsShellReshape): once, and again after a
 * rollback, since 1.2.8 drops the shell's keys on its next write. Everything else in the save is already the shell's
 * shape or Solitaire's own and passes through untouched.
 */
export function reshapeForShell(state: PersistedState, seatColors: Record<1 | 2, string>): PersistedState {
  if (state === undefined || state === null || typeof state !== 'object' || !needsShellReshape(state)) return state
  const saved = state as PersistedState & SavedRoot
  const tableColor = saved.tableColor ?? {}
  const lock = saved.settings ?? {}
  const lockedRotation: ViewRotation | undefined = lock.lockedRotation
  return {
    ...saved,
    profileSelection: { 1: typeof saved.activeProfile === 'string' ? saved.activeProfile : null, 2: null },
    seatColors: {
      lastGuestColor: { 1: typeof tableColor.guestColor === 'string' ? tableColor.guestColor : seatColors[1], 2: seatColors[2] },
      lastCpuColor: seatColors[2],
      profileColors: picksFor(tableColor.profileColors, saved.profiles)
    },
    appSettings: { lockOrientation: lock.lockOrientation === true, ...(lockedRotation === undefined ? {} : { lockedRotation }), deferBottomEdgeGestures: false }
  } as PersistedState
}

/** Wraps the store's other migrate (the guide's returning-player check, which runs first so it still sees a store
 * from before Redux as it was) with the reshape. */
export function createShellMigrate(migrate: Migrate, seatColors: Record<1 | 2, string>): Migrate {
  return async (state, version) => reshapeForShell(await migrate(state, version), seatColors)
}
