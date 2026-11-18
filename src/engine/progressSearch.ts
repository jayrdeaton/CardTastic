// The rules live in @tastic/cardtastic-engine, which Tastic-Server replays daily leaderboard runs with, so the app and the server
// can never play different rules. This file only re-exports its part of them, so the app's imports (and tests' mocks) stay put
export type { ProgressSpec, SearchMode, SearchOutcome, SearchStep } from '@tastic/cardtastic-engine'
export { allDestinations, columnsKey, faceDownCount, foundationDownMoves, HINT_SEARCH_BUDGET, HINT_SEARCH_MAX_MS, isConclusive, LOOKAHEAD_BUDGET, LOOKAHEAD_MAX_MS, pileKey, ProgressSearch } from '@tastic/cardtastic-engine'
