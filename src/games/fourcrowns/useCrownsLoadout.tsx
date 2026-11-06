// Four Crowns' part of the shell's setup screen (GameDefinition.useLoadout). Seats 1 and 2 are the shell's (seat 2 a CPU,
// Player 2 or a profile); under them, who sits in seats 3 and 4: nobody, a person passing the phone, or a CPU (seat 4's
// row shows once seat 3 is taken). Every CPU plays at seat 2's level, picked on its menu; with a person in seat 2 that
// menu has no level to pick, so a row of levels shows while a CPU sits in seat 3 or 4. All of it is Settings, so it
// follows the player; the match plays on the snapshot taken when everyone readies up.

import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { CPU_LEVEL_LABELS, CPU_LEVELS, CPU_OPTIONS, type CpuLevel } from '@/games/table/cpuLevel'
import { LoadoutPills } from '@/games/table/LoadoutPills'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { CROWNS_SEAT_KINDS, type CrownsSeatKind } from './engine/types'

/** The settings a Four Crowns match runs on. */
export type CrownsRoundSettings = Pick<Settings, 'crownsCpu' | 'crownsSeat3' | 'crownsSeat4'>

const SEAT_KIND_LABELS: Record<CrownsSeatKind, string> = { off: 'None', person: 'Person', cpu: 'CPU' }

export function useCrownsLoadout(mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: CrownsRoundSettings = { crownsCpu: settings.crownsCpu, crownsSeat3: settings.crownsSeat3, crownsSeat4: settings.crownsSeat4 }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <CrownsOptions {...props} mode={mode} settings={roundSettings} onChange={setSettings} />,
    optionIds: [],
    // The seats are who's playing, so the dice only roll the CPUs' level.
    randomize: () => setSettings({ crownsCpu: CPU_LEVELS[Math.floor(Math.random() * CPU_LEVELS.length)] }),
    reset: () => setSettings({ crownsCpu: 'medium', crownsSeat3: 'off', crownsSeat4: 'off' }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.crownsCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ crownsCpu: value as CpuLevel }) }
  }
}

function CrownsOptions({ mode, settings, onChange, ...look }: LoadoutOptionsProps & { mode: RoundMode; settings: CrownsRoundSettings; onChange: (patch: Partial<Settings>) => void }) {
  const seatRow = (seat: 3 | 4, value: CrownsSeatKind) => (
    <View style={styles.row}>
      <Text variant='labelLarge' style={[styles.label, { color: look.mutedColor }]}>
        {`Player ${seat}`}
      </Text>
      <LoadoutPills {...look} kind='choice' testID={`fourcrowns-seat${seat}`} pills={CROWNS_SEAT_KINDS.map((kind) => ({ key: kind, label: SEAT_KIND_LABELS[kind], on: value === kind, onPress: () => onChange(seat === 3 ? { crownsSeat3: kind } : { crownsSeat4: kind }) }))} />
    </View>
  )
  const extraCpu = settings.crownsSeat3 === 'cpu' || (settings.crownsSeat3 !== 'off' && settings.crownsSeat4 === 'cpu')
  return (
    <View style={styles.rows}>
      {seatRow(3, settings.crownsSeat3)}
      {settings.crownsSeat3 !== 'off' ? seatRow(4, settings.crownsSeat4) : null}
      {mode === 'twoPlayer' && extraCpu ? (
        <View style={styles.row}>
          <Text variant='labelLarge' style={[styles.label, { color: look.mutedColor }]}>
            CPU
          </Text>
          <LoadoutPills {...look} kind='choice' testID='fourcrowns-cpu' pills={CPU_LEVELS.map((level) => ({ key: level, label: CPU_LEVEL_LABELS[level], on: settings.crownsCpu === level, onPress: () => onChange({ crownsCpu: level }) }))} />
        </View>
      ) : null}
    </View>
  )
}

// The rows share one centered column, each left-aligned in it, so their labels line up.
const styles = StyleSheet.create({
  label: { minWidth: 64 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  rows: { alignSelf: 'center', gap: 10 }
})
