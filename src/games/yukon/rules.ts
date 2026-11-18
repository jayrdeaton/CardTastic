// yukon's rules live in @tastic/cardtastic-engine, which Tastic-Server replays daily leaderboard runs with, so the app and the server
// can never play different rules. This file only re-exports them, so the app's imports (and tests' mocks) stay put
import { createYukonController as create } from '@tastic/cardtastic-engine/yukon'

export * from '@tastic/cardtastic-engine/yukon'
// Assigned rather than only re-exported above, so a test can spy on it (a re-export's binding can't be replaced)
export const createYukonController = create
