// Seats 3 and 4 at a table for up to four (Four Crowns, Crazy Eights). Seats 1 and 2 are the shell's (seat 2 a CPU, a
// person or a profile, picked on its own button); the shell knows no more than two seats, so seats 3 and 4 are each
// game's own Settings: nobody, a person passing the phone, or a CPU. They can't be profiles until the shell seats more
// than two players. Every CPU at the table plays at one level: seat 2's menu sets it, or (with a person in seat 2) a
// rule pill of its own.

import type { OptionPickerOption } from '@tastic/profile'

import { previewCardBack } from '@/components/theme'

import { CPU_LEVEL_LABELS, CPU_LEVELS, type CpuLevel } from './cpuLevel'
import type { TableRule } from './RulePickers'
import type { Seat } from './TableChrome'

/** Who sits in seat 3 or 4. */
export type ExtraSeatKind = 'off' | 'person' | 'cpu'
export const EXTRA_SEAT_KINDS: readonly ExtraSeatKind[] = ['off', 'person', 'cpu']

export function isExtraSeatKind(value: unknown): value is ExtraSeatKind {
  return EXTRA_SEAT_KINDS.includes(value as ExtraSeatKind)
}

/** Seats 3 and 4's colors (seat 2's is the shell's Material Blue). */
const EXTRA_SEAT_COLORS = ['#4CAF50', '#FF9800']

/** Someone at the table: a person or a CPU, and how they're shown. */
export interface TablePlayer {
  kind: 'person' | 'cpu'
  seat: Seat
}

/** Who sits at the table, in turn order: seat 1's player, seat 2's (a person or a CPU), then seats 3 and 4 if taken
 * (seat 4 only after seat 3). A lone CPU is CPU; several are numbered. */
export function tablePlayers(seats: Record<1 | 2, Seat>, seat2Person: boolean, seat3: ExtraSeatKind, seat4: ExtraSeatKind, dark: boolean): TablePlayer[] {
  const kinds: ('person' | 'cpu')[] = ['person', seat2Person ? 'person' : 'cpu']
  if (seat3 !== 'off') {
    kinds.push(seat3)
    if (seat4 !== 'off') kinds.push(seat4)
  }
  const cpuCount = kinds.filter((kind) => kind === 'cpu').length
  let cpuNumber = 0
  return kinds.map((kind, i) => {
    const base: Seat = i < 2 ? seats[(i + 1) as 1 | 2] : { name: `Player ${i + 1}`, tag: null, icon: 'account', color: previewCardBack(EXTRA_SEAT_COLORS[i - 2], dark) }
    if (kind === 'person') return { kind, seat: base }
    cpuNumber++
    return { kind, seat: { ...base, name: cpuCount > 1 ? `CPU ${cpuNumber}` : 'CPU', tag: null, icon: 'robot-outline' } }
  })
}

const SEAT_ICONS: Record<ExtraSeatKind, string> = { off: 'account-off-outline', person: 'account', cpu: 'robot-outline' }

function seatChoices(seat: 3 | 4): OptionPickerOption<ExtraSeatKind>[] {
  return [
    { value: 'off', label: `No Player ${seat}`, icon: SEAT_ICONS.off },
    { value: 'person', label: `Player ${seat}: Person`, icon: SEAT_ICONS.person },
    { value: 'cpu', label: `Player ${seat}: CPU`, icon: SEAT_ICONS.cpu }
  ]
}

const CPU_CHOICES: OptionPickerOption<CpuLevel>[] = CPU_LEVELS.map((level) => ({ value: level, label: `CPU, ${CPU_LEVEL_LABELS[level]}`, icon: 'robot-outline' }))

/** The seat 3 and 4 pills (seat 4's once seat 3 is taken), and the CPUs' level when seat 2's menu can't set it: a
 * person sits in seat 2 and a CPU in seat 3 or 4. */
export function extraSeatRules({ seat3, seat4, cpu, seat2Person, onSeat3, onSeat4, onCpu }: { seat3: ExtraSeatKind; seat4: ExtraSeatKind; cpu: CpuLevel; seat2Person: boolean; onSeat3: (kind: ExtraSeatKind) => void; onSeat4: (kind: ExtraSeatKind) => void; onCpu: (level: CpuLevel) => void }): TableRule[] {
  const rules: TableRule[] = [{ key: 'seat3', icon: SEAT_ICONS[seat3], value: seat3, choices: seatChoices(3), onChange: (value) => onSeat3(value as ExtraSeatKind) }]
  if (seat3 !== 'off') rules.push({ key: 'seat4', icon: SEAT_ICONS[seat4], value: seat4, choices: seatChoices(4), onChange: (value) => onSeat4(value as ExtraSeatKind) })
  const extraCpu = seat3 === 'cpu' || (seat3 !== 'off' && seat4 === 'cpu')
  if (seat2Person && extraCpu) rules.push({ key: 'cpu', icon: 'robot-outline', value: cpu, choices: CPU_CHOICES, onChange: (value) => onCpu(value as CpuLevel) })
  return rules
}

/** Every rule key extraSeatRules can show. */
export const EXTRA_SEAT_RULE_KEYS = ['seat3', 'seat4', 'cpu'] as const
