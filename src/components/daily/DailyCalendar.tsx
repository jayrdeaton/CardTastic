import { useAutoPaperTheme } from '@rific/auto-paper'
import Heatmap, { type DataPoint } from '@rific/heatmap'
import { localDateString } from '@tastic/achievements'
import { StatSection } from '@tastic/hud/chrome'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { dayLabel, useCalendarLook } from '@/components/PlayCalendar'
import { isMotionReduced } from '@/components/reducedMotionFlag'
import type { RootState } from '@/redux/store'
import { commaString } from '@/utils/commaString'

// How far in from the well's left edge the day's line may reach: clear of its "DAILY DEALS" label
const DAY_LINE_LEFT = 140

// The calendar's tooltip is the well's title line instead, as on the Stats tab
const noTooltip = () => null

/** What a day says: its Dailies won, or none. */
export function describeDailies(won: number): string {
  if (won === 0) return 'No Dailies won'
  return `${commaString(won)} ${won === 1 ? 'Daily' : 'Dailies'} won`
}

/** Each day's Dailies won by the players shown (one profile, or every profile under Everyone), in the games shown (all, or the game picker's). */
export function dailyWinsByDay(history: RootState['dailyHistory'], players: string[], gameIds: readonly string[] | null): Record<string, number> {
  const days: Record<string, number> = {}
  for (const player of players) {
    for (const [day, games] of Object.entries(history[player] ?? {})) {
      const won = gameIds ? games.filter((game) => gameIds.includes(game)).length : games.length
      if (won > 0) days[day] = (days[day] ?? 0) + won
    }
  }
  return days
}

/**
 * The Records tab's DAILY DEALS calendar (Jay, 2026-11-20): a square a day, shaded by the Dailies won that day, out of the eleven
 * games', by the profile the player picker is on, or every profile under Everyone, in the games the game picker is on. A tapped day
 * shows its count on the well's title line, today's with none tapped, as the Stats tab's calendar does, and looks the same
 * (useCalendarLook). Fed by stores/daily.ts' history of each server player's wins (dailyHistorySlice.ts, kept from 2026-11-20), so a
 * player's wins leave with it.
 */
export function DailyCalendar({ profileId, gameIds }: { profileId: string | null; gameIds: readonly string[] | null }) {
  const { colors } = useAutoPaperTheme()
  const { dark } = useTheme()
  const { theme, colorScale } = useCalendarLook()
  const daily = useSelector((state: RootState) => state.daily.players)
  const history = useSelector((state: RootState) => state.dailyHistory)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const days = useMemo(() => {
    const owners = profileId ? [profileId] : Object.keys(daily)
    const players = owners.map((owner) => daily[owner]?.player).filter((player): player is string => !!player)
    return dailyWinsByDay(history, players, gameIds)
  }, [daily, history, profileId, gameIds])
  const data = useMemo<DataPoint[]>(() => Object.entries(days).map(([date, value]) => ({ date, value })), [days])

  const now = new Date()
  const date = selectedDay ?? localDateString(now)
  const line = `${dayLabel(date, now)} · ${describeDailies(days[date] ?? 0)}`

  return (
    <StatSection label='DAILY DEALS'>
      <View testID='daily-calendar'>
        <Text variant='labelMedium' numberOfLines={1} accessibilityLiveRegion='polite' style={[styles.dayLine, { color: colors.onSurfaceVariant }]} testID='daily-calendar-line'>
          {line}
        </Text>
        <Heatmap.Calendar data={data} color={colors.primary} colorScheme={dark ? 'dark' : 'light'} colorScale={colorScale} theme={theme} animated={!isMotionReduced()} selectedDate={selectedDay} onSelectionChange={setSelectedDay} renderTooltip={noTooltip} tooltipLabel='Daily' tooltipEmptyLabel='No Dailies' />
      </View>
    </StatSection>
  )
}

const styles = StyleSheet.create({
  // On the well's title line, as the Stats tab's calendar's: above the calendar by StatSection's 8pt gap, right-aligned, cut short
  // with an ellipsis before it reaches the label
  dayLine: {
    bottom: '100%',
    left: DAY_LINE_LEFT,
    marginBottom: 8,
    position: 'absolute',
    right: 0,
    textAlign: 'right'
  }
})
