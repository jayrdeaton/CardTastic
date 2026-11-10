import { getBlendedColor, useAutoPaperTheme } from '@rific/auto-paper'
import Heatmap, { type ColorScale, type DataPoint, type TimelineDataPoint } from '@rific/heatmap'
import { localDateString } from '@tastic/achievements'
import { useMemo, useState } from 'react'
import { type LayoutChangeEvent, Pressable, StyleSheet, Text as NativeText, View } from 'react-native'
import { SegmentedButtons, Text, useTheme } from 'react-native-paper'

import type { DayRecord } from '@/stores/statsTypes'
import { commaString } from '@/utils/commaString'

import { isMotionReduced } from './reducedMotionFlag'
import { SEGMENT_THEME } from './segmentedButtons'
import { useTableColors } from './theme'

/** How much of the felt an empty day keeps, over the well's surface: a softened ("disabled") felt that still reads as felt in dark mode (at 0.45 it all but vanished there). */
export const EMPTY_DAY_FELT = 0.7

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Oct 22, 2026" from a day's YYYY-MM-DD key, or "Oct 22" when `now` is in the same year. */
export function formatDay(date: string, now?: Date): string {
  const [year, month, day] = date.split('-').map(Number)
  return now && now.getFullYear() === year ? `${MONTHS[month - 1]} ${day}` : `${MONTHS[month - 1]} ${day}, ${year}`
}

/**
 * A day's name on the calendar's line, counted from `now` (Jay, 2026-10-22): Today, Yesterday, then the weekday for the
 * rest of the past week, then the date (a weekday a week back would read as this week's).
 */
export function dayLabel(date: string, now: Date): string {
  const [year, month, day] = date.split('-').map(Number)
  const then = new Date(year, month - 1, day)
  // Rounded, since a day across a daylight saving change is 23 or 25 hours.
  const daysAgo = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - then.getTime()) / 86_400_000)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  if (daysAgo > 1 && daysAgo < 7) return WEEKDAYS[then.getDay()]
  return formatDay(date, now)
}

/** An hour of the day as a clock reads it: "12 AM", "9 AM", "12 PM", "3 PM". */
export function hourName(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`
}

/** An hour's name on the calendar's line: its day as dayLabel names it, then the hour ("Today 3 PM", "Oct 15, 9 PM"). */
export function hourLabel(time: number, now: Date): string {
  const at = new Date(time)
  const day = dayLabel(localDateString(at), now)
  return `${day}${/\d$/.test(day) ? ',' : ''} ${hourName(at.getHours())}`
}

/** What a tapped day says: its deals and wins, or none. */
export function describeDay(played: number, won: number): string {
  if (played === 0) return 'No deals'
  const deals = `${commaString(played)} ${played === 1 ? 'deal' : 'deals'}`
  return won > 0 ? `${deals}, ${commaString(won)} won` : deals
}

/** How far in from the well's left edge the day's line may reach: 12pt clear of the well's "CALENDAR" label (93pt on the web build). */
export const DAY_LINE_LEFT = 105

// The calendar's square (@rific/heatmap's default theme), the padding round it on every side (12% of it, rounded up),
// and from one week's column to the next
const CELL_SIZE = 14
const CELL_RADIUS = 2
const CELL_GAP = 2 * Math.ceil(CELL_SIZE * 0.12)
const CELL_PITCH = CELL_SIZE + CELL_GAP
// The calendar's height, 7 days under the month labels' 18pt line: the hourly view keeps it, so switching moves nothing
const CALENDAR_HEIGHT = 7 * CELL_PITCH + 18

/** Hours to each of the hourly view's columns (Lumber's hourly view), so a day takes 4: night, morning, afternoon and evening. */
export const HOURS_PER_COLUMN = 6

// The 6-hour block holding a moment
function blockStart(moment: Date): Date {
  const start = new Date(moment)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() - (start.getHours() % HOURS_PER_COLUMN))
  return start
}

// The block `by` blocks after `start`, on the clock (as the grid steps them), so a column still starts at 06:00 across a
// daylight saving change
function shiftBlock(start: Date, by: number): Date {
  const next = new Date(start)
  next.setHours(next.getHours() + HOURS_PER_COLUMN * by)
  return next
}

/** The hourly view's window: its first column's start, and its last cell, the hour under way, ending the last column. */
export function hourWindow(now: Date, columns: number): { startTime: number; endTime: number } {
  const hour = new Date(now)
  hour.setMinutes(0, 0, 0)
  return { startTime: shiftBlock(blockStart(hour), 1 - columns).getTime(), endTime: hour.getTime() }
}

/** A day of the hourly view: its key, its first column's start, and where its columns run across the grid. Named unless it's a first day showing fewer than 2 of its columns, whose name would run into the next day's. */
export type HourDay = { day: string; start: Date; left: number; width: number; named: boolean }

/**
 * The days in view, oldest first, placed as the grid places their columns: cells share what the gaps leave of its width,
 * a gap between columns and that again between days (the grid's boundaryGap), so each day is its columns and the gaps
 * among them. Lumber's, as its hourly view lays them out.
 */
export function hourDays(startTime: number, columns: number, width: number, gap: number): HourDay[] {
  const runs: { start: Date; columns: number }[] = []
  for (let c = 0; c < columns; c++) {
    const start = shiftBlock(new Date(startTime), c)
    if (c === 0 || start.getHours() === 0) runs.push({ start, columns: 0 })
    runs[runs.length - 1].columns++
  }
  const cell = (width - (columns - 1) * gap - (runs.length - 1) * gap) / columns
  let left = 0
  return runs.map(({ start, columns: count }) => {
    const day = { day: localDateString(start), start, left, width: count * cell + (count - 1) * gap, named: start.getHours() === 0 || 24 - start.getHours() >= 2 * HOURS_PER_COLUMN }
    left += day.width + 2 * gap
    return day
  })
}

// The day keys from the window's first hour to its last, oldest first
function windowDays(startTime: number, endTime: number): string[] {
  const last = localDateString(new Date(endTime))
  const keys: string[] = []
  // Stepped at noon, so a day across a daylight saving change is still one step
  for (const day = new Date(startTime); localDateString(day) <= last; day.setDate(day.getDate() + 1)) {
    day.setHours(12, 0, 0, 0)
    keys.push(localDateString(day))
  }
  return keys
}

// The start of an hour of a day key
function hourTime(date: string, hour: number): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, hour).getTime()
}

/** Each hour's deals in the window, for the grid. */
export function hourData(days: Record<string, DayRecord>, startTime: number, endTime: number): TimelineDataPoint[] {
  const data: TimelineDataPoint[] = []
  for (const date of windowDays(startTime, endTime)) {
    for (const [hour, record] of Object.entries(days[date]?.hours ?? {})) {
      const time = hourTime(date, Number(hour))
      if (record.played > 0 && time >= startTime && time <= endTime) data.push({ timestamp: new Date(time).toISOString(), value: record.played })
    }
  }
  return data
}

/**
 * The hour the window's hours are kept from, or null when they all are. Hours were first kept on 2026-11-08, so a day in
 * view with deals its hours don't account for is from before: its hours are dimmed (the grid's minTime), as nothing kept
 * rather than nothing played, up to its first kept hour, or to its end when it has none.
 */
export function hoursKeptFrom(days: Record<string, DayRecord>, startTime: number, endTime: number): number | null {
  let from: number | null = null
  for (const date of windowDays(startTime, endTime)) {
    const day = days[date]
    if (!day || day.played === 0) continue
    const kept = Object.entries(day.hours ?? {}).filter(([, record]) => record.played > 0)
    if (kept.reduce((sum, [, record]) => sum + record.played, 0) >= day.played) continue
    from = kept.length > 0 ? Math.min(...kept.map(([hour]) => hourTime(date, Number(hour)))) : hourTime(date, 24)
  }
  return from !== null && from > startTime ? from : null
}

export type CalendarUnit = 'days' | 'hours'

const UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' }
]

// The calendar's tooltip is the well's title line instead (see PlayCalendar), so the package draws none
const noTooltip = () => null

/**
 * A year of play, a square a day, the most recent week on the right and the year before it a scroll away
 * (@rific/heatmap's calendar): each day shaded by the deals that ended on it, in the player's color. Or, switched to Hours
 * (Jay, 2026-11-08, as Lumber has), the last days by hour, six hours to a column and four columns to a day, ending with the
 * hour under way. A tapped day or hour is outlined and shows its deals and wins on the well's title line, right of the
 * label (Jay, 2026-10-22: the package's popover ignored the theme and Blur, poked out above the well and would have covered
 * days near the one tapped); with none tapped, the line shows today, or this hour. Nothing else is outlined: today used to
 * be, but an outline is for what's picked (Jay, 2026-11-08), and today still pulses.
 * Fed by the stats' day log (statsTypes.ts' `days`, kept from 2026-10-22, its hours from 2026-11-08, so older play doesn't
 * show). Drawn on the Stats screen's Calendar well, so it takes the well's surface colors (hud's wellSurface). Its load
 * ripple and today's pulse are left out under Reduce Motion (reducedMotion.tsx).
 */
export function PlayCalendar({ days }: { days: Record<string, DayRecord> }) {
  const { colors } = useAutoPaperTheme()
  const { tableFelt } = useTableColors()
  const { dark } = useTheme()
  const [unit, setUnit] = useState<CalendarUnit>('days')
  // At most one of them: a day (tapped on the calendar, or by its name over the hours) or an hour
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [width, setWidth] = useState(0)
  const data = useMemo<DataPoint[]>(() => Object.entries(days).map(([date, day]) => ({ date, value: day.played })), [days])
  const theme = useMemo(() => ({ backgroundColor: 'transparent', monthLabelColor: colors.onSurfaceVariant, dayLabelColor: colors.onSurfaceVariant, todayBorderColor: 'transparent', selectedBorderColor: colors.onSurface }), [colors])
  // An empty day is the felt, muted (Jay, 2026-10-22: "the felt color, or a disabled variant of it"); a day played is the
  // player's color, in even steps from a pale tint to full. The package's own scale fades from near-black in dark mode (or
  // white in light), so its lightest shades sat almost on the empty color against this well.
  const colorScale = useMemo(() => {
    const empty = getBlendedColor(tableFelt, colors.surface, EMPTY_DAY_FELT)
    const shade = (amount: number) => getBlendedColor(colors.primary, colors.surface, amount)
    return { emptyColor: empty, colors: [empty, shade(0.35), shade(0.58), shade(0.8), colors.primary] }
  }, [colors, tableFelt])

  const selectDay = (date: string | null) => {
    setSelectedDay(date)
    setSelectedHour(null)
  }
  const selectHour = (time: number | null) => {
    setSelectedHour(time)
    setSelectedDay(null)
  }
  // A picked hour stays picked as its day
  const switchUnit = (next: string) => {
    if (next === 'days' && selectedHour !== null) selectDay(localDateString(new Date(selectedHour)))
    setUnit(next as CalendarUnit)
  }

  // Read from the days as they are now, not as they were at the tap: the game and player pickers change them under a day
  // or hour that stays picked
  const now = new Date()
  const hour = selectedHour ?? (selectedDay === null && unit === 'hours' ? hourWindow(now, 1).endTime : null)
  let line: string
  if (hour !== null) {
    const record = days[localDateString(new Date(hour))]?.hours?.[String(new Date(hour).getHours())]
    line = `${hourLabel(hour, now)} · ${describeDay(record?.played ?? 0, record?.won ?? 0)}`
  } else {
    const date = selectedDay ?? localDateString(now)
    line = `${dayLabel(date, now)} · ${describeDay(days[date]?.played ?? 0, days[date]?.won ?? 0)}`
  }

  return (
    <View testID='play-calendar' style={styles.calendar} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Text variant='labelMedium' numberOfLines={1} accessibilityLiveRegion='polite' style={[styles.dayLine, { color: colors.onSurfaceVariant }]}>
        {line}
      </Text>
      {unit === 'days' ? (
        <Heatmap.Calendar data={data} color={colors.primary} colorScheme={dark ? 'dark' : 'light'} colorScale={colorScale} theme={theme} animated={!isMotionReduced()} selectedDate={selectedDay} onSelectionChange={selectDay} renderTooltip={noTooltip} tooltipLabel='deal' tooltipEmptyLabel='No deals' />
      ) : width > 0 ? (
        <HourCalendar days={days} width={width} colorScale={colorScale} dark={dark} selectedDay={selectedDay} selectedHour={selectedHour} onSelectDay={selectDay} onSelectHour={selectHour} />
      ) : (
        <View style={styles.hours} />
      )}
      <SegmentedButtons value={unit} onValueChange={switchUnit} buttons={UNITS} theme={SEGMENT_THEME} />
    </View>
  )
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// A day's name reaches up into the space over the hours and down to them, so it's a finger's height
const DAY_NAME_HIT_SLOP = { bottom: 6, top: 8 }

interface HourCalendarProps {
  days: Record<string, DayRecord>
  width: number
  colorScale: Partial<ColorScale>
  dark: boolean
  selectedDay: string | null
  selectedHour: number | null
  onSelectDay: (date: string | null) => void
  onSelectHour: (time: number | null) => void
}

/**
 * The hourly view (@rific/heatmap's grid): as many columns of 6 hours as the calendar's weeks would fill the well with, a
 * day to every 4, ending with the block under way, each day's name over its first column. An hour or a day's name is a
 * tap to pick it (outlined, the day's in the gutter round its columns), again to let it go, as is a tap elsewhere here.
 * Lumber's hourly view, laid out the same way (its LogHeatmap.tsx).
 */
function HourCalendar({ days, width, colorScale, dark, selectedDay, selectedHour, onSelectDay, onSelectHour }: HourCalendarProps) {
  const { colors } = useAutoPaperTheme()
  const columns = Math.max(4, Math.floor(width / CELL_PITCH))
  const { startTime, endTime } = hourWindow(new Date(), columns)
  const data = useMemo(() => hourData(days, startTime, endTime), [days, startTime, endTime])
  const keptFrom = useMemo(() => hoursKeptFrom(days, startTime, endTime), [days, startTime, endTime])
  const dayRuns = useMemo(() => hourDays(startTime, columns, width - CELL_GAP, CELL_GAP), [startTime, columns, width])
  const endDate = useMemo(() => new Date(endTime), [endTime])
  const minTime = useMemo(() => (keptFrom === null ? undefined : new Date(keptFrom)), [keptFrom])
  const selected = useMemo(() => (selectedHour === null ? null : new Date(selectedHour)), [selectedHour])
  const gridTheme = useMemo(() => ({ gap: CELL_GAP, boundaryGap: CELL_GAP, cellRadius: CELL_RADIUS, selectedColor: colors.onSurface }), [colors.onSurface])
  const openDay = selectedDay ? dayRuns.find((run) => run.day === selectedDay) : undefined
  const anySelected = selectedDay !== null || selectedHour !== null

  return (
    <Pressable onPress={anySelected ? () => onSelectDay(null) : undefined} accessible={false} style={styles.hours}>
      <View style={styles.dayNames}>
        {dayRuns.map(({ day, start, left, width: dayWidth, named }) => {
          if (!named) return null
          const open = day === selectedDay
          return (
            <Pressable key={day} onPress={() => onSelectDay(open ? null : day)} hitSlop={DAY_NAME_HIT_SLOP} accessibilityRole='button' accessibilityState={{ selected: open }} accessibilityLabel={`${WEEKDAYS[start.getDay()]}, ${formatDay(day)}`} style={({ pressed }) => [styles.dayBox, { left, width: dayWidth }, pressed && styles.pressed]}>
              <NativeText style={[styles.dayName, { color: open ? colors.onSurface : colors.onSurfaceVariant }]}>{`${SHORT_WEEKDAYS[start.getDay()]} ${start.getDate()}`}</NativeText>
            </Pressable>
          )
        })}
      </View>
      <View>
        <Heatmap.Grid
          data={data}
          rows={HOURS_PER_COLUMN}
          columns={columns}
          granularity='hour'
          fillDirection='column'
          align
          endTime={endDate}
          colorScale={colorScale}
          colorScheme={dark ? 'dark' : 'light'}
          theme={gridTheme}
          animated={!isMotionReduced()}
          minTime={minTime}
          selected={selected}
          onCellPress={(bucket) => {
            const time = bucket.startTime.getTime()
            onSelectHour(time === selectedHour ? null : time)
          }}
          valueLabel='deal'
        />
        {openDay ? <View pointerEvents='none' testID='open-day' style={[styles.dayOutline, { borderColor: colors.onSurface, borderRadius: CELL_RADIUS + CELL_GAP / 2, left: openDay.left - CELL_GAP / 2, width: openDay.width + CELL_GAP }]} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  calendar: { gap: 8 },
  // A day's place on the line of names, over its columns, the name at its foot
  dayBox: { bottom: 0, justifyContent: 'flex-end', position: 'absolute', top: 0 },
  // On the well's title line: above the calendar by StatSection's 8pt gap, on the label's 16pt line, right-aligned and
  // cut short with an ellipsis before it reaches the label.
  dayLine: {
    bottom: '100%',
    left: DAY_LINE_LEFT,
    marginBottom: 8,
    position: 'absolute',
    right: 0,
    textAlign: 'right'
  },
  // The calendar's month labels' size, running on over the day's other columns
  dayName: { fontSize: 10, left: 0, lineHeight: 14, position: 'absolute', width: 80 },
  // The line of day names, filling what the hours leave of the calendar's height
  dayNames: { flex: 1, marginBottom: 4 },
  // Round an open day's columns, in the gutter round them rather than over the cells
  dayOutline: { borderWidth: 1.5, bottom: -CELL_GAP / 2, position: 'absolute', top: -CELL_GAP / 2 },
  // The calendar's box: its height, and its squares' padding round the grid, so the bottom rows line up
  hours: { height: CALENDAR_HEIGHT, paddingBottom: CELL_GAP / 2, paddingHorizontal: CELL_GAP / 2 },
  pressed: { opacity: 0.6 }
})
