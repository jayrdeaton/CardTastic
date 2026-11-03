// Which profile this device was playing as, until @tastic/shell's `profileSelection` (seat 1) took over in the
// CardTastic move (2026-10-29; redux/shellMigrate.ts copies it across). Kept in `solitaire:root` for one release, as
// it was at the move, so an OTA rolled back to 1.2.8 finds the same player: this reducer only keeps what it
// rehydrates (redux-persist puts the saved value back, and no action changes it). Delete it in the release after.
export type ActiveProfileState = string | null

export default function activeProfile(state: ActiveProfileState = null): ActiveProfileState {
  return state
}
