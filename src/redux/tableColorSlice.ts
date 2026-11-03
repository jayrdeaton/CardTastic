// Each player's color pick in Solitaire (Home's player dropdown, "Solitaire only"), until @tastic/shell's
// `seatColors` took over in the CardTastic move (2026-10-29; redux/shellMigrate.ts copies the picks across). Kept in
// `solitaire:root` for one release, as it was at the move, so an OTA rolled back to 1.2.8 finds every pick: this
// reducer only keeps what it rehydrates (redux-persist puts the saved value back, and no action changes it). Delete
// it in the release after.
//
// Stores saved before 2026-10-16 also hold an `override` key (the old live color); nothing reads it.
export interface TableColorState {
  // Guest's pick - null until guest picks one.
  guestColor: string | null
  // Each profile's pick, by profile id. Absent in a store saved before 2026-10-16.
  profileColors?: Record<string, string>
}

const initialState: TableColorState = { guestColor: null, profileColors: {} }

export default function tableColor(state: TableColorState = initialState): TableColorState {
  return state
}
