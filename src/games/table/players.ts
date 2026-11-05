// The two seats at a two-player table: player 1 at the bottom, player 2 (a person or the CPU) at the top.

export type PlayerIndex = 1 | 2

export function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 1 ? 2 : 1
}

/** Against the CPU, player 1 is the only person at the table. */
export const VS_CPU_HUMANS: readonly PlayerIndex[] = [1]
export const TWO_PLAYER_HUMANS: readonly PlayerIndex[] = [1, 2]
