// A solitaire game's part of its setup screen (the shell's one-player loadout, games/shared/solitaireLoadout.tsx). Jay,
// 2026-11-21: the player, the rules, the Daily Deal and then READY? read as one disjointed list, with nothing saying which
// part the button started. Now, under the player (who plays both): the Daily Deal first, since the game's rules don't
// apply to it, then a divider and everything about a game of one's own (a random deal): a card like the Daily's, with
// Continue first over a game in progress, then the rules, then New Deal under the rules it deals by. Both start the round
// through the shell's onReady. New Deal over a game in progress is how to quit it from here (Jay asked for one): it asks
// first, as the game's own New Game does, and counts the game the same way. Every card's rows run to its edges (components/cardRows.tsx), so the card is the touch target. The
// game's name is in the screen's header (the shell's), not here. In a window wider than tall (a phone held sideways) the
// two sections sit side by side.

import { ConfirmDialog } from '@tastic/hud/chrome'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Text } from 'react-native-paper'

import { CardWell } from '@/components/cardRows'
import { DailyRow } from '@/components/daily/DailyRow'
import { TodaysDeal } from '@/components/daily/TodaysDeal'
import { useLocalDay } from '@/components/daily/useLocalDay'
import type { GameRule } from '@/components/gameRule'
import { formatDay } from '@/components/PlayCalendar'
import { RuleRows } from '@/components/RuleRows'
import { CHROME_FG } from '@/components/theme'
import { abandonGameInProgress, gameInProgressMoves } from '@/stores/gameInProgress'
import { useGameStats } from '@/stores/gameStats'
import type { SolitaireGameId } from '@/stores/statsTypes'

import { variantOfSave } from './savedVariant'

/** A section's width: the dialogs' 360, never closer than 16pt to an edge. */
const SECTION_MAX_WIDTH = 360
const SECTION_MARGIN = 16
/** Between the two sections, and between the player and the first. */
const SECTION_GAP = 24

export function SolitaireSetup({ game, rules, seats, onReady, inProgress, progress }: LoadoutOptionsProps & { game: SolitaireGameId; rules: GameRule[]; inProgress: boolean; progress: string | null }) {
  const window = useWindowDimensions()
  const day = useLocalDay()
  const sideBySide = window.width > window.height
  const width = Math.min(SECTION_MAX_WIDTH, sideBySide ? (window.width - 2 * SECTION_MARGIN - SECTION_GAP) / 2 : window.width - 2 * SECTION_MARGIN)
  const { recordDealAbandoned } = useGameStats()
  const [confirmingNewDeal, setConfirmingNewDeal] = useState(false)

  // A new deal ends any game in progress here, counted as the game's own New Game counts it (a loss once it has a move, which is
  // asked first, as there)
  function dealOverGame() {
    setConfirmingNewDeal(false)
    const saved = abandonGameInProgress(game)
    if (saved && saved.moves > 0) recordDealAbandoned(variantOfSave(game, saved.config), { seconds: saved.elapsedSeconds, moves: saved.moves })
    onReady?.()
  }

  return (
    <View style={styles.column} testID={`${game}-setup`}>
      {/* Who's playing comes first (Jay, 2026-11-18): it's who plays the Daily and the random deal alike */}
      {seats}
      <View style={sideBySide ? styles.sectionsRow : styles.sections}>
        <View style={[styles.section, { width }]} testID={`${game}-daily-section`}>
          <SetupDivider label={`Daily Deal · ${formatDay(day, new Date())}`} />
          <CardWell>
            <TodaysDeal game={game} day={day} />
          </CardWell>
        </View>
        <View style={[styles.section, { width }]} testID={`${game}-random-section`}>
          <SetupDivider label='Random Deal' />
          <CardWell testID={`${game}-random-card`}>
            {inProgress && <DailyRow icon='play-circle-outline' label='Continue' caption={progress ?? 'Your game in progress'} onPress={onReady} trailing='play' testID={`${game}-continue`} />}
            {rules.length > 0 && (
              <View testID={`${game}-rules`}>
                <RuleRows rules={rules} />
              </View>
            )}
            <DailyRow icon='shuffle-variant' label='New Deal' caption={inProgress ? 'Ends the game in progress' : 'A new shuffle'} onPress={() => (gameInProgressMoves(game) > 0 ? setConfirmingNewDeal(true) : dealOverGame())} trailing='play' testID={`${game}-new-deal`} />
          </CardWell>
        </View>
      </View>
      {/* The game's own New Game confirm, word for word (GameChrome) */}
      <ConfirmDialog visible={confirmingNewDeal} title='Start a New Game?' message='This game is still in progress. Starting a new one counts it as a loss.' confirmLabel='New Game' cancelLabel='Cancel' icon='alert-circle-outline' onConfirm={dealOverGame} onCancel={() => setConfirmingNewDeal(false)} />
    </View>
  )
}

/** A section's name between two hairlines, on the felt: the Daily's (with its date) and the random deal's. */
export function SetupDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider} accessibilityRole='header'>
      <View style={styles.hairline} />
      <Text variant='labelMedium' style={styles.dividerLabel} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.hairline} />
    </View>
  )
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: SECTION_GAP
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  dividerLabel: {
    color: CHROME_FG,
    flexShrink: 1,
    fontWeight: 'bold',
    letterSpacing: 2,
    opacity: 0.85
  },
  hairline: {
    backgroundColor: CHROME_FG,
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.4
  },
  section: {
    gap: 12
  },
  sections: {
    alignItems: 'center',
    gap: SECTION_GAP
  },
  sectionsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SECTION_GAP
  }
})
