// RatSlap's part of the shell's setup screen (GameDefinition.useLoadout): the CPU's level on seat 2's menu, and the
// match's rules as three switches. Both are Settings, so they follow the player like every other rule here; the match
// plays on the snapshot taken when everyone readies up (roundSettings, read back by the play screen).

import { Pressable } from '@rific/feedback-press'
import type { MenuOption } from '@tastic/hud/lobby'
import type { GameLoadout, LoadoutOptionsProps, RoundMode } from '@tastic/shell'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'

import { CPU_LEVEL_LABELS } from './cpuLabels'
import { CPU_LEVELS, type CpuLevel } from './engine/cpu'

/** The settings a RatSlap match runs on. */
export type RatSlapRoundSettings = Pick<Settings, 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers' | 'ratslapCpu'>

const RULE_SWITCHES: { key: 'ratslapDoubles' | 'ratslapSandwiches' | 'ratslapJokers'; label: string }[] = [
  { key: 'ratslapDoubles', label: 'Doubles' },
  { key: 'ratslapSandwiches', label: 'Sandwiches' },
  { key: 'ratslapJokers', label: 'Jokers' }
]

const CPU_OPTIONS: MenuOption<string>[] = CPU_LEVELS.map((level) => ({ value: level, label: `CPU, ${CPU_LEVEL_LABELS[level]}` }))

export function useRatSlapLoadout(_mode: RoundMode): GameLoadout {
  const { settings, setSettings } = useSettings()
  const roundSettings: RatSlapRoundSettings = { ratslapDoubles: settings.ratslapDoubles, ratslapSandwiches: settings.ratslapSandwiches, ratslapJokers: settings.ratslapJokers, ratslapCpu: settings.ratslapCpu }
  return {
    roundSettings,
    options: (props: LoadoutOptionsProps) => <RuleSwitches {...props} values={roundSettings} onToggle={(key) => setSettings({ [key]: !roundSettings[key] })} />,
    optionIds: [],
    randomize: () => setSettings({ ratslapDoubles: Math.random() < 0.5, ratslapSandwiches: Math.random() < 0.5, ratslapJokers: Math.random() < 0.5 }),
    reset: () => setSettings({ ratslapDoubles: true, ratslapSandwiches: true, ratslapJokers: true }),
    seatControl: () => undefined,
    cpuDifficulty: { value: settings.ratslapCpu, options: CPU_OPTIONS, onChange: (value) => setSettings({ ratslapCpu: value as CpuLevel }) }
  }
}

/** The match's rules, each a switch: on, it's filled in the loadout's accent; off, an outline. */
function RuleSwitches({ values, onToggle, accentColor, onAccentColor, mutedColor }: LoadoutOptionsProps & { values: RatSlapRoundSettings; onToggle: (key: (typeof RULE_SWITCHES)[number]['key']) => void }) {
  return (
    // Drawn inside the loadout's turned frame already, so no turn of its own.
    <View style={styles.row}>
      {RULE_SWITCHES.map(({ key, label }) => {
        const on = values[key]
        return (
          <Pressable key={key} onPress={() => onToggle(key)} accessibilityRole='switch' accessibilityState={{ checked: on }} accessibilityLabel={label} testID={`ratslap-rule-${key}`} style={[styles.switch, on ? { backgroundColor: accentColor, borderColor: accentColor } : { borderColor: mutedColor }]}>
            <Icon source={on ? 'check' : 'close'} size={16} color={on ? onAccentColor : mutedColor} />
            <Text variant='labelLarge' style={{ color: on ? onAccentColor : mutedColor }}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  switch: { alignItems: 'center', borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', gap: 4, height: 36, paddingHorizontal: 12 }
})
