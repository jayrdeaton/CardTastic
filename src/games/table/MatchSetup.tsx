// A two-player game's part of the shell's setup screen (GameLoadout.options), the same in every one: who's playing, then
// its rules on a card (Jay, 2026-11-10: "both places"), the same row as in the Settings sheet (components/RuleRows.tsx:
// the choices in effect, a tap sliding every rule's choices open), writing the same settings, so the two always agree.
// From 2026-11-08 to 11-10 the setup screen only listed the choices, muted, and a tap on them opened Settings, with
// nothing saying they were rules or could be changed. Then any seats past the shell's two (Four Crowns, Crazy Eights:
// games/table/extraSeats.ts), which are who's playing, not rules. With one person this sits over Ready; with two face to
// face, in the band between them, where it names the game too: everywhere else the shell's header does (titleShown;
// Jay, 2026-11-21: the name right over the seat buttons read as one of the options).

import { FadingScrollView } from '@rific/auto-paper'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Text } from 'react-native-paper'

import { CardWell } from '@/components/cardRows'
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
/** The same with one person, who has the whole screen: the header (60), their seat buttons (44), Ready (44), the gaps between
 * (28 and 16) and 30pt above and below. Every game's rules fit opened on a 402x874 phone; a 375x667 one scrolls Gin Rummy's
 * last rule a little. */
export const RULES_CARD_RESERVED_HEIGHT_ALONE = 260
/** The least the card is ever given: nearly two rows, its edge fading over the next. Reached only on a 375x667 phone face
 * to face with three seat pills (Four Crowns or Crazy Eights with a CPU in seat 3: the pills wrap one to a row there),
 * where 180 pushed both Ready buttons 19pt off the screen. */
export const RULES_CARD_MIN_HEIGHT = 120
/** The column's gap, above the seat pills. */
const COLUMN_GAP = 16

export function MatchSetup({ game, title, titleShown, rules, extraSeats, seats, host, accentColor, dark }: LoadoutOptionsProps & { game: string; title: string; rules: GameRule[]; extraSeats?: TableRule[] }) {
  const window = useWindowDimensions()
  // Seats 3 and 4 wrap onto a second row on a phone when there are three pills, so their height is measured.
  const [seatPillsHeight, setSeatPillsHeight] = useState(0)
  const hasSeatPills = !!extraSeats && extraSeats.length > 0
  const width = Math.min(RULES_CARD_MAX_WIDTH, window.width - 2 * RULES_CARD_MARGIN)
  // With one person the shell hands over the seat buttons (placesSeats), and there's no second half of the screen to keep
  const reserved = seats ? RULES_CARD_RESERVED_HEIGHT_ALONE : RULES_CARD_RESERVED_HEIGHT
  const maxHeight = Math.max(RULES_CARD_MIN_HEIGHT, window.height - reserved - (hasSeatPills ? seatPillsHeight + COLUMN_GAP : 0))
  return (
    <View style={styles.column} testID={`${game}-setup`}>
      {!titleShown && (
        <Text variant='headlineSmall' style={[styles.center, { color: CHROME_FG }]} accessibilityRole='header'>
          {title}
        </Text>
      )}
      {/* Who's playing comes first (Jay, 2026-11-18): with one person the shell hands the seat buttons over (GameLoadout.placesSeats) */}
      {seats}
      {rules.length > 0 && (
        // Its row runs to the card's edges (components/cardRows.tsx), so the whole card is the touch target
        <CardWell style={{ width }} testID={`${game}-rules`}>
          <FadingScrollView style={{ maxHeight }} alwaysBounceVertical={false} showsVerticalScrollIndicator={false}>
            <RuleRows rules={rules} />
          </FadingScrollView>
        </CardWell>
      )}
      {hasSeatPills && <RulePickers game={game} rules={extraSeats} host={host} accentColor={accentColor} dark={dark} onLayout={(event) => setSeatPillsHeight(event.nativeEvent.layout.height)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center'
  },
  column: {
    alignItems: 'center',
    gap: COLUMN_GAP
  }
})
