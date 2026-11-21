import { configureStore } from '@reduxjs/toolkit'
import { localDateString } from '@tastic/achievements'
import { render, screen } from '@testing-library/react-native'
import { Provider as PaperProvider } from 'react-native-paper'
import { Provider } from 'react-redux'

import { dailyWinsByDay, describeDailies } from '@/components/daily/DailyCalendar'
import dailyHistory, { dailyHistoryActions } from '@/redux/dailyHistorySlice'
import daily, { dailyActions } from '@/redux/dailySlice'

// The Records tab's DAILY DEALS calendar: each server player's Daily wins by day (dailyHistorySlice), shaded per day, for one profile
// or every profile, in the games picked.

jest.mock('@/components/theme', () => {
  const actual = jest.requireActual('@/components/theme')
  return { ...actual, useTableColors: () => actual.lightColors }
})
const mockCalendar = jest.fn()
jest.mock('@rific/heatmap', () => ({
  __esModule: true,
  default: {
    Calendar: (props: { data: { date: string; value: number }[] }) => {
      mockCalendar(props)
      return null
    }
  }
}))

const TODAY = localDateString(new Date())

describe('the Daily wins history', () => {
  it('notes each Daily the server took once, under its player and day', () => {
    let state = dailyHistory(undefined, dailyHistoryActions.won({ player: 'p1', day: '2026-11-20', game: 'klondike' }))
    state = dailyHistory(state, dailyHistoryActions.won({ player: 'p1', day: '2026-11-20', game: 'klondike' }))
    state = dailyHistory(state, dailyHistoryActions.won({ player: 'p1', day: '2026-11-20', game: 'spider' }))
    expect(state).toEqual({ p1: { '2026-11-20': ['klondike', 'spider'] } })
  })

  it("drops a player's wins with the player (deleted, or replaced by a new one)", () => {
    let state = dailyHistory(undefined, dailyHistoryActions.won({ player: 'p1', day: '2026-11-20', game: 'klondike' }))
    state = dailyHistory(state, dailyHistoryActions.won({ player: 'p2', day: '2026-11-20', game: 'golf' }))
    state = dailyHistory(state, dailyActions.playersKept([{ owner: 'kid', player: 'p2' }]))
    expect(state).toEqual({ p2: { '2026-11-20': ['golf'] } })
  })
})

describe('a day of Dailies', () => {
  const history = { p1: { '2026-11-19': ['klondike', 'spider'], '2026-11-20': ['golf'] }, p2: { '2026-11-20': ['klondike'] } } as const

  it("counts one player's wins, or every player's added up", () => {
    expect(dailyWinsByDay(history as never, ['p1'], null)).toEqual({ '2026-11-19': 2, '2026-11-20': 1 })
    expect(dailyWinsByDay(history as never, ['p1', 'p2'], null)).toEqual({ '2026-11-19': 2, '2026-11-20': 2 })
  })

  it('counts only the games picked', () => {
    expect(dailyWinsByDay(history as never, ['p1', 'p2'], ['klondike'])).toEqual({ '2026-11-19': 1, '2026-11-20': 1 })
  })

  it('says how many were won', () => {
    expect([0, 1, 3].map(describeDailies)).toEqual(['No Dailies won', '1 Daily won', '3 Dailies won'])
  })
})

describe('DailyCalendar', () => {
  async function show(profileId: string | null, gameIds: readonly string[] | null = null) {
    const { DailyCalendar } = require('@/components/daily/DailyCalendar')
    const store = configureStore({ reducer: { daily, dailyHistory } })
    store.dispatch(dailyActions.playerJoined({ owner: 'kid', player: 'p1' }))
    store.dispatch(dailyActions.playerJoined({ owner: 'dad', player: 'p2' }))
    store.dispatch(dailyHistoryActions.won({ player: 'p1', day: TODAY, game: 'klondike' }))
    store.dispatch(dailyHistoryActions.won({ player: 'p1', day: TODAY, game: 'spider' }))
    store.dispatch(dailyHistoryActions.won({ player: 'p2', day: TODAY, game: 'klondike' }))
    await render(
      <Provider store={store}>
        <PaperProvider>
          <DailyCalendar profileId={profileId} gameIds={gameIds} />
        </PaperProvider>
      </Provider>
    )
  }

  beforeEach(() => mockCalendar.mockClear())

  it("shades each day by a profile's Dailies won, today's count on the title line", async () => {
    await show('kid')
    expect(screen.getByText('DAILY DEALS')).toBeTruthy()
    expect(screen.getByTestId('daily-calendar-line')).toHaveTextContent('Today · 2 Dailies won')
    expect(mockCalendar.mock.lastCall![0].data).toEqual([{ date: TODAY, value: 2 }])
  })

  it('adds every profile up under Everyone, and narrows to the games picked', async () => {
    await show(null)
    expect(screen.getByTestId('daily-calendar-line')).toHaveTextContent('Today · 3 Dailies won')
    await show(null, ['klondike'])
    expect(screen.getAllByTestId('daily-calendar-line').at(-1)).toHaveTextContent('Today · 2 Dailies won')
  })

  it("is empty for a profile that hasn't played one", async () => {
    await show('sam')
    expect(screen.getByTestId('daily-calendar-line')).toHaveTextContent('Today · No Dailies won')
  })
})
