// The rules live in @tastic/cardtastic-engine, which Tastic-Server replays daily leaderboard runs with, so the app and the server
// can never play different rules. This file only re-exports its part of them, so the app's imports (and tests' mocks) stay put
export type { HintResult } from '@tastic/cardtastic-engine'
export { cachedSearchOutcome, cacheSearchOutcome, findHint, hintCountFor, hintSearchOutcome } from '@tastic/cardtastic-engine'
