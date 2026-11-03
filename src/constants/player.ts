import { DEFAULT_SEED_COLOR } from './theme'

// The key everything kept per player (saved games, settings, stats buckets, par and records) files Guest under
// while no profile is in seat 1. Profile ids are `profile-<time>-<random>`, so it can never name a real profile.
// The same value as @tastic/shell's GUEST_PLAYER_ID (pinned by store.test.ts), kept here so the slices and the
// saved-games module don't load the shell's whole barrel for one string.
export const GUEST_PLAYER_ID = 'guest'

// The pack's seat colors (pack.ts' seatColors). Seat 1's is the one every fresh install and guest starts on. Seat 2's
// is unused until a game has a second seat (Ratscrew): the CPU's and a second guest's starting color, and where
// avoidSeatColorClash moves seat 2 when both seats land on one color. Material Blue 500, the other seat color
// DuelTastic and PuckTastic use.
export const SEAT_COLORS = { 1: DEFAULT_SEED_COLOR, 2: '#2196f3' } as const satisfies Record<1 | 2, string>
