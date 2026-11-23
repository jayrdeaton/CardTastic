import { useAutoPaperTheme } from '@rific/auto-paper'
import { BaseStatsScreen, ScreenFrame, StatSection, useWellColors } from '@tastic/hud/chrome'
import { ProfileChip } from '@tastic/profile'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatTime } from '@/components/GameChrome'
import { formatDay } from '@/components/PlayCalendar'
import { CHROME_FG } from '@/components/theme'
import { ordinal } from '@/engine/topWins'
import { type DailyBoard, type DailyBoardEntry, fetchDailyBoard, localDay } from '@/stores/daily'
import { GAME_TITLES, type SolitaireGameId } from '@/stores/statsTypes'
import { commaString } from '@/utils/commaString'
import { safeBack } from '@/utils/navigation'

const MAX_WIDTH = 640

/** A game's Daily board for today: the players who chose to show, by score (moves plus the server's seconds), and where you stand. */
export function DailyBoardScreen() {
  const { game } = useLocalSearchParams<{ game: SolitaireGameId }>()
  return (
    <ScreenFrame portalHost maxContentWidth={MAX_WIDTH}>
      <BoardContent key={game} game={game} />
    </ScreenFrame>
  )
}

function BoardContent({ game }: { game: SolitaireGameId }) {
  const insets = useSafeAreaInsets()
  const [day] = useState(localDay)
  const [board, setBoard] = useState<DailyBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    fetchDailyBoard(game, day)
      .then((next) => {
        if (current) setBoard(next)
      })
      .catch((failure: unknown) => {
        if (current) setError(failure instanceof Error ? failure.message : 'Something went wrong')
      })
    return () => {
      current = false
    }
  }, [game, day])

  const you = board && 'rank' in board.you ? board.you : null
  const youOnBoard = !!board?.entries.some((entry) => entry.you)
  return (
    <BaseStatsScreen title={`${GAME_TITLES[game]} Daily`} onBack={safeBack} insets={insets} fg={CHROME_FG} bg='transparent'>
      <StatSection label={formatDay(day, new Date()).toUpperCase()}>
        {!board && !error && <ActivityIndicator style={styles.loading} />}
        {error && <Muted text={error} />}
        {board && board.entries.length === 0 && <Muted text='No wins posted yet' />}
        {board && board.entries.length > 0 && <Row header />}
        {board?.entries.map((entry, index) => (
          <Row key={index} entry={entry} />
        ))}
      </StatSection>
      {you && !youOnBoard && (
        <StatSection label='YOU'>
          <Row header />
          <Row entry={{ ...you, you: true }} />
          <Muted text={you.listed ? `${ordinal(you.rank)} today` : `You'd be ${ordinal(you.rank)} today. Only you can see this.`} />
        </StatSection>
      )}
    </BaseStatsScreen>
  )
}

function Muted({ text }: { text: string }) {
  const { fgMuted } = useWellColors()
  return (
    <Text variant='bodyMedium' style={{ color: fgMuted }}>
      {text}
    </Text>
  )
}

function Row({ entry, header }: { entry?: DailyBoardEntry; header?: boolean }) {
  const { colors } = useAutoPaperTheme()
  const { fg, fgMuted } = useWellColors()
  const variant = header ? 'labelSmall' : 'bodyMedium'
  const muted = { color: fgMuted }
  const strong = { color: header ? fgMuted : fg }
  const color = entry?.color ?? colors.primary
  return (
    <View style={styles.row} testID={entry?.you ? 'daily-board-you' : undefined}>
      {/* Your row is outlined in your own color, the chip's, as the calendar outlines a picked day. It was the theme's
          tertiaryContainer, an opaque pale magenta for a yellow player that read as a hole in the well; a see-through fill of
          the player's color went grey on a blue well, so it's an outline: it reads on any well, in either mode (Jay, 2026-11-23).
          Drawn over the row rather than as the row's border, so the columns don't move */}
      {entry?.you && <View pointerEvents='none' style={[StyleSheet.absoluteFill, styles.youOutline, { borderColor: color }]} testID='daily-board-you-outline' />}
      <Text variant={variant} style={[styles.rank, muted]}>
        {entry ? entry.rank : '#'}
      </Text>
      <View style={styles.player}>{entry && <ProfileChip profile={{ id: 'board', name: '', color, tag: entry.tag ?? '', createdAt: 0, updatedAt: 0 }} size={26} />}</View>
      <Text variant={variant} style={[styles.number, strong]}>
        {entry ? commaString(entry.score) : 'SCORE'}
      </Text>
      <Text variant={variant} style={[styles.number, muted]}>
        {entry ? formatTime(entry.seconds) : 'TIME'}
      </Text>
      <Text variant={variant} style={[styles.number, muted]}>
        {entry ? commaString(entry.moves) : 'MOVES'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 12
  },
  number: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: 56
  },
  player: {
    flex: 1
  },
  rank: {
    fontVariant: ['tabular-nums'],
    width: 26
  },
  // Every row, the header too, runs 8pt into the well's 16pt padding with 12pt inside, so the columns stay where they were
  // and your row's outline reaches past them with room round the rank and the moves (its highlight ended 4pt from them)
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: -8,
    minHeight: 36,
    paddingHorizontal: 12
  },
  youOutline: {
    borderRadius: 10,
    borderWidth: 2
  }
})
