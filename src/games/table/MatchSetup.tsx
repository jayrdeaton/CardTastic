// A two-player game's part of the shell's setup screen (GameLoadout.options), the same in every one (Jay, 2026-11-08:
// a game's rules live in Settings, not on its setup screen): the game's name, then its house rules in effect, a line
// each, which open the Settings sheet where they're changed (the same sheet as the corner cog, How to Play row included), then
// any seats past the shell's two (Four Crowns, Crazy Eights: games/table/extraSeats.ts), which are who's playing, not
// rules. With one person this sits over the seat buttons; with two face to face, in the band between them.

import { Pressable } from '@rific/feedback-press'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { useGameGuide } from '@tastic/shell'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { type GameRule, ruleChoiceLabel, ruleSummary } from '@/components/gameRule'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG, CHROME_FG_MUTED } from '@/components/theme'

import { RulePickers, type TableRule } from './RulePickers'

export function MatchSetup({ game, title, rules, extraSeats, host, accentColor, dark }: LoadoutOptionsProps & { game: string; title: string; rules: GameRule[]; extraSeats?: TableRule[] }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { openFor } = useGameGuide()
  return (
    <View style={styles.column} testID={`${game}-setup`}>
      <View style={styles.heading}>
        <Text variant='headlineSmall' style={[styles.center, { color: CHROME_FG }]} accessibilityRole='header'>
          {title}
        </Text>
        {rules.length > 0 && (
          <Pressable onPress={() => setSettingsOpen(true)} style={({ pressed }) => [styles.summary, pressed && styles.pressed]} accessibilityRole='button' accessibilityLabel={`House rules: ${ruleSummary(rules)}`} accessibilityHint='Opens Settings' testID={`${game}-rules-summary`}>
            {/* A rule a line, each whole: wrapped onto one line they broke inside a rule ("7 Cards, 5 / for 3+") or opened
            a line on a separator. */}
            {rules.map((rule) => (
              <Text key={rule.key} variant='bodyMedium' numberOfLines={1} style={[styles.center, { color: CHROME_FG_MUTED }]}>
                {ruleChoiceLabel(rule)}
              </Text>
            ))}
          </Pressable>
        )}
      </View>
      {extraSeats && extraSeats.length > 0 && <RulePickers game={game} rules={extraSeats} host={host} accentColor={accentColor} dark={dark} />}
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} onShowHowToPlay={() => openFor(game)} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center'
  },
  column: {
    alignItems: 'center',
    gap: 16
  },
  heading: {
    alignItems: 'center',
    gap: 2
  },
  pressed: {
    opacity: 0.6
  },
  summary: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 6
  }
})
