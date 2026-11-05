import type { MenuOption } from '@tastic/hud/lobby'

// The CPU's three levels, the same names in every two-player game (RatSlap, Slapjack, Six-Card Golf, Trash). Each game's
// own cpu.ts says what a level means there: a reaction time in the slap games, how carefully it plays in the others.

export type CpuLevel = 'easy' | 'medium' | 'hard'

export const CPU_LEVELS: readonly CpuLevel[] = ['easy', 'medium', 'hard']

export const DEFAULT_CPU_LEVEL: CpuLevel = 'medium'

export function isCpuLevel(value: unknown): value is CpuLevel {
  return CPU_LEVELS.includes(value as CpuLevel)
}

/** The levels as the setup screen, the table and the Stats tab name them. */
export const CPU_LEVEL_LABELS: Record<CpuLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

/** Seat 2's CPU entries on the setup screen's menu (GameLoadout.cpuDifficulty). */
export const CPU_OPTIONS: MenuOption<string>[] = CPU_LEVELS.map((level) => ({ value: level, label: `CPU, ${CPU_LEVEL_LABELS[level]}` }))
