import type { Profile, ProfileColorPick } from '@tastic/profile'
import type { ProfileSelectionState, SeatColorsState } from '@tastic/shell'
import type { PersistedState } from 'redux-persist'

type Migrate = (state: PersistedState, version: number) => Promise<PersistedState>

type SavedSettings = Record<string, unknown>

// What a 1.2.8 `solitaire:root` holds that moves or goes, read defensively: it's whatever was on disk.
interface SavedRoot {
  // Which profile was playing: seat 1 of the shell's `profileSelection` now.
  activeProfile?: string | null
  // Guest's color pick and each profile's, by id: the shell's `seatColors` now. A store saved before 2026-10-16 has no
  // `profileColors`, and an `override` key nothing reads.
  tableColor?: { guestColor?: string | null; profileColors?: Record<string, string> } | null
  // Lock Orientation (`lockOrientation`, `lockedRotation`) sat in the settings and in each player's filed settings.
  settings?: SavedSettings
  playerSettings?: Record<string, { settings?: SavedSettings } | null | undefined>
  profiles?: unknown
  profileSelection?: ProfileSelectionState
  seatColors?: SeatColorsState
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
function picksFor(saved: Record<string, string> | undefined, profiles: unknown): Record<string, ProfileColorPick> {
  const roster = Array.isArray(profiles) ? (profiles as Partial<Profile>[]) : []
  const picks: Record<string, ProfileColorPick> = {}
  for (const [id, color] of Object.entries(saved ?? {})) {
    const profileColor = roster.find((p) => p?.id === id)?.color
    if (typeof color === 'string' && typeof profileColor === 'string' && !sameColor(color, profileColor)) picks[id] = { color, profileColor }
  }
  return picks
}

// Lock Orientation went with @tastic/shell 0.5 (2026-11-06, the OS turns the screen and its own rotation lock replaces it).
function withoutLock(settings: SavedSettings): SavedSettings {
  const { lockOrientation: _locked, lockedRotation: _angle, ...rest } = settings
  return rest
}

function playerSettingsWithoutLocks(filed: NonNullable<SavedRoot['playerSettings']>): NonNullable<SavedRoot['playerSettings']> {
  return Object.fromEntries(Object.entries(filed).map(([id, entry]) => [id, entry?.settings && typeof entry.settings === 'object' ? { ...entry, settings: withoutLock(entry.settings) } : entry]))
}

/**
 * Reshapes a 1.2.8 save for @tastic/shell, in place under the same `solitaire:` prefix (Decisions for Jay 1 in
 * TODO.md's CardTastic plan): `activeProfile` becomes seat 1 of `profileSelection` and `tableColor` becomes `seatColors`
 * (guest's pick as seat 1's guest color, each profile's pick by id), and both go. Lock Orientation goes from the
 * settings and from every player's filed settings: it went with @tastic/shell 0.5 (2026-11-06). There's no persist
 * version, so this runs on every launch and acts only while the save has Solitaire's keys and not the shell's
 * (needsShellReshape): once. Everything else in the save is already the shell's shape or Solitaire's own and passes
 * through untouched.
 *
 * From the move (2026-10-29) until 2026-11-06 the old keys and the lock stayed in the save for one release, so an OTA
 * rolled back to 1.2.8 found each player, color pick and lock as they were (Jay). The build that lets the OS turn the
 * screen has a new native fingerprint, so 1.2.8's JS can't be rolled back onto it, and they went (Jay, 2026-11-06).
 */
export function reshapeForShell(state: PersistedState, seatColors: Record<1 | 2, string>): PersistedState {
  if (state === undefined || state === null || typeof state !== 'object' || !needsShellReshape(state)) return state
  const { activeProfile, tableColor, ...saved } = state as PersistedState & SavedRoot
  const colors = tableColor ?? {}
  return {
    ...saved,
    ...(saved.settings && typeof saved.settings === 'object' ? { settings: withoutLock(saved.settings) } : {}),
    ...(saved.playerSettings && typeof saved.playerSettings === 'object' ? { playerSettings: playerSettingsWithoutLocks(saved.playerSettings) } : {}),
    profileSelection: { 1: typeof activeProfile === 'string' ? activeProfile : null, 2: null },
    seatColors: {
      lastGuestColor: { 1: typeof colors.guestColor === 'string' ? colors.guestColor : seatColors[1], 2: seatColors[2] },
      lastCpuColor: seatColors[2],
      profileColors: picksFor(colors.profileColors, saved.profiles)
    }
  } as PersistedState
}

/** Wraps the store's other migrate (the guide's returning-player check, which runs first so it still sees a store
 * from before Redux as it was) with the reshape. */
export function createShellMigrate(migrate: Migrate, seatColors: Record<1 | 2, string>): Migrate {
  return async (state, version) => reshapeForShell(await migrate(state, version), seatColors)
}
