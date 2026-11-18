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
  return (
    <View style={[styles.row, entry?.you && { backgroundColor: colors.tertiaryContainer }]} testID={entry?.you ? 'daily-board-you' : undefined}>
      <Text variant={variant} style={[styles.rank, muted]}>
        {entry ? entry.rank : '#'}
      </Text>
      <View style={styles.player}>{entry && <ProfileChip profile={{ id: 'board', name: '', color: entry.color ?? colors.primary, tag: entry.tag ?? '', createdAt: 0, updatedAt: 0 }} size={26} />}</View>
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
  row: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 4
  }
})
