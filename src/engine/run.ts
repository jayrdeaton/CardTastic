import type { RunAction } from '@tastic/cardtastic-engine'

/** A deal as it was played: its seed and every action that changed the board, in order (@tastic/cardtastic-engine's run format:
 * each move and draw, auto-played ones included, and each Undo press). Replaying it with the rules gives the same board and move
 * count, which is what Tastic-Server checks before a daily deal goes on its board. useGameSession records it; saves keep it. */
export interface DealRun {
  seed: number
  actions: RunAction[]
}
