// The rules live in @tastic/cardtastic-engine, which Tastic-Server replays daily leaderboard runs with, so the app and the server
// can never play different rules. This file only re-exports its part of them, so the app's imports (and tests' mocks) stay put
export type { RandomFn } from '@tastic/cardtastic-engine'
export { mulberry32, randomSeed, shuffle } from '@tastic/cardtastic-engine'
