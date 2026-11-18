// A two-player game's part of the shell's setup screen (GameLoadout.options), the same in every one: the game's name,
// then its rules on a card (Jay, 2026-11-10: "both places"), the same rows as in the Settings sheet (components/
// RuleRows.tsx: the rule's name, the choice in effect, a tap opening its choices in place), writing the same settings, so
// the two always agree. From 2026-11-08 to 11-10 the setup screen only listed the choices, muted, and a tap on them opened
// Settings, with nothing saying they were rules or could be changed. Then any seats past the shell's two (Four Crowns,
// Crazy Eights: games/table/extraSeats.ts), which are who's playing, not rules. With one person this sits over the seat
// buttons; with two face to face, in the band between them.

import { FadingScrollView } from '@rific/auto-paper'
import { useWellColors, WELL_SHADOW } from '@tastic/hud/chrome'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { type ReactNode, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Text } from 'react-native-paper'

import type { GameRule } from '@/components/gameRule'
import { RuleRows } from '@/components/RuleRows'
import { CHROME_FG } from '@/components/theme'

import { RulePickers, type TableRule } from './RulePickers'

/** The rules card's width: the dialogs' 360 (the Settings sheet's rows are that wide), never closer than 16pt to an edge. */
export const RULES_CARD_MAX_WIDTH = 360
const RULES_CARD_MARGIN = 16

/** The window height the rest of the setup screen keeps, besides the seat pills (measured, below), when the card would
 * not fit: face to face, both people's seat buttons and Ready, the action band and the title take 360pt (measured on the
 * web build at 375x667), plus 30pt above and below. A shorter window scrolls the card (its edges fade while there's
 * more) rather than push a Ready button off the screen: on a 375x667 phone face to face, Gin Rummy's four rows (264pt)
 * scroll a little, and a rule opened there scrolls on phones up to about 812pt tall. */
export const RULES_CARD_RESERVED_HEIGHT = 420
/** The least the card is ever given: nearly two rows, its edge fading over the next. Reached only on a 375x667 phone face
 * to face with three seat pills (Four Crowns or Crazy Eights with a CPU in seat 3: the pills wrap one to a row there),
 * where 180 pushed both Ready buttons 19pt off the screen. */
export const RULES_CARD_MIN_HEIGHT = 120
/** The column's gap, above the seat pills. */
const COLUMN_GAP = 16

export function MatchSetup({ game, title, rules, extra, extraSeats, seats, host, accentColor, dark }: LoadoutOptionsProps & { game: string; title: string; extra?: ReactNode; rules: GameRule[]; extraSeats?: TableRule[] }) {
  const window = useWindowDimensions()
  const well = useWellColors()
  // Seats 3 and 4 wrap onto a second row on a phone when there are three pills, so their height is measured.
  const [seatPillsHeight, setSeatPillsHeight] = useState(0)
  const hasSeatPills = !!extraSeats && extraSeats.length > 0
  // A window wider than tall has no height for two cards stacked (a phone held sideways, 402pt): they sit side by side
  const sideBySide = !!extra && rules.length > 0 && window.width > window.height
  const width = Math.min(RULES_CARD_MAX_WIDTH, sideBySide ? (window.width - 2 * RULES_CARD_MARGIN - COLUMN_GAP) / 2 : window.width - 2 * RULES_CARD_MARGIN)
  const maxHeight = Math.max(RULES_CARD_MIN_HEIGHT, window.height - RULES_CARD_RESERVED_HEIGHT - (hasSeatPills ? seatPillsHeight + COLUMN_GAP : 0))
  return (
    <View style={styles.column} testID={`${game}-setup`}>
      <Text variant='headlineSmall' style={[styles.center, { color: CHROME_FG }]} accessibilityRole='header'>
        {title}
      </Text>
      {/* Who's playing comes first (Jay, 2026-11-18): with one person the shell hands the seat buttons over (GameLoadout.placesSeats) */}
      {seats}
      <View style={sideBySide ? styles.cardsRow : styles.cards}>
        {rules.length > 0 && (
          <View style={[styles.card, { width, backgroundColor: well.bg }]} testID={`${game}-rules`}>
            <FadingScrollView style={{ maxHeight }} contentContainerStyle={styles.cardContent} alwaysBounceVertical={false} showsVerticalScrollIndicator={false}>
              <RuleRows rules={rules} />
            </FadingScrollView>
          </View>
        )}
        {/* A card of the game's own under its rules (a solitaire game's Daily Deal) */}
        {extra && <View style={[styles.card, styles.cardContent, { width, backgroundColor: well.bg }]}>{extra}</View>}
      </View>
      {hasSeatPills && <RulePickers game={game} rules={extraSeats} host={host} accentColor={accentColor} dark={dark} onLayout={(event) => setSeatPillsHeight(event.nativeEvent.layout.height)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  // A well (hud's wellSurface: the theme's surface on MD3's level-1 shadow), the stats screen's and Home's tiles' card.
  card: {
    borderRadius: 12,
    boxShadow: WELL_SHADOW
  },
  // The rows carry their own 10pt above and below; the card adds the stats wells' 16 at the sides.
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 6
  },
  cards: {
    alignItems: 'center',
    gap: COLUMN_GAP
  },
  cardsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: COLUMN_GAP
  },
  center: {
    textAlign: 'center'
  },
  column: {
    alignItems: 'center',
    gap: COLUMN_GAP
  }
})
