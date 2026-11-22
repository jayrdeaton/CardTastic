import { configureStore } from '@reduxjs/toolkit'
import { FeedbackPressProvider } from '@rific/feedback-press'
import type { LoadoutOptionsProps } from '@tastic/shell'
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react-native'
import type { ReactElement, ReactNode } from 'react'
import { Text } from 'react-native'
import * as RNPaper from 'react-native-paper'
import { Provider as PaperProvider } from 'react-native-paper'
import { Provider } from 'react-redux'

import { klondikeRuleSettings } from '@/games/klondike/ruleSettings'
import { solitaireLoadout } from '@/games/shared/solitaireLoadout'
import { SolitaireSetup } from '@/games/shared/SolitaireSetup'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'

// A solitaire game's setup screen (Jay, 2026-11-21): under the player, the Daily Deal first (the rules don't apply to it), then
// a divider and the random deal's card: Continue over a game in progress, the rules, then New Deal under the rules it deals by,
// which ends a game in progress after asking, counted as the game's own New Game counts it. The shell draws no Ready; the game's
// name is the shell's header's.

jest.mock('@/components/daily/TodaysDeal', () => ({
  TodaysDeal: ({ day }: { day: string }) => {
    const { Text: MockText } = jest.requireActual('react-native')
    return <MockText>{`today's deal ${day}`}</MockText>
  }
}))
jest.mock('@/components/daily/useLocalDay', () => ({ useLocalDay: () => '2026-11-21' }))
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ settings: jest.requireActual('@/redux/settingsSlice').DEFAULT_SETTINGS, setSettings: jest.fn() }) }))
let mockFocused = true
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }))
let mockMoves = 0
const mockAbandon = jest.fn()
jest.mock('@/stores/gameInProgress', () => ({
  ...jest.requireActual('@/stores/gameInProgress'),
  gameInProgressMoves: () => mockMoves,
  abandonGameInProgress: (game: string) => mockAbandon(game)
}))
const mockRecordAbandoned = jest.fn()
jest.mock('@/stores/gameStats', () => ({ useGameStats: () => ({ recordDealAbandoned: mockRecordAbandoned }) }))

const optionsProps = { host: { openId: null, open: jest.fn(), close: jest.fn(), toggle: jest.fn() }, accentColor: '#fff', mutedColor: '#888', onAccentColor: '#000', dark: true, titleShown: true } as unknown as LoadoutOptionsProps
const drawn = () => JSON.stringify(screen.toJSON())
const klondikeRules = () => klondikeRuleSettings(DEFAULT_SETTINGS, jest.fn())

beforeEach(() => {
  mockFocused = true
  mockMoves = 0
  jest.clearAllMocks()
})

const show = (element: ReactElement) =>
  render(
    <PaperProvider>
      <FeedbackPressProvider paper={RNPaper} soundInitialValue={{ enabled: false }}>
        {element}
      </FeedbackPressProvider>
    </PaperProvider>
  )

describe('SolitaireSetup', () => {
  it('puts the player first, then the Daily Deal, then the random deal: its rules, then the row that deals it', async () => {
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} seats={<Text>who is playing</Text>} inProgress={false} progress={null} />)

    const order = ['who is playing', 'DAILY DEAL · NOV 21', "today's deal 2026-11-21", 'RANDOM DEAL', 'Draw 1', 'New Deal'].map((text) => drawn().indexOf(text))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    // The row that deals it is the random deal's, in its card with the rules, not the Daily's
    expect(within(screen.getByTestId('klondike-random-card')).getByText('New Deal')).toBeTruthy()
    expect(within(screen.getByTestId('klondike-random-card')).getByTestId('klondike-rules')).toBeTruthy()
    expect(within(screen.getByTestId('klondike-daily-section')).queryByText('New Deal')).toBeNull()
  })

  it('starts the round through the shell', async () => {
    const onReady = jest.fn()
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} onReady={onReady} inProgress={false} progress={null} />)
    await fireEvent.press(screen.getByText('New Deal'))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(mockRecordAbandoned).not.toHaveBeenCalled()
  })

  it('puts Continue, with how far the game has got, above the rules over a game in progress, and New Deal still under them', async () => {
    const onReady = jest.fn()
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} onReady={onReady} inProgress progress='12 moves · 4:05' />)
    const order = ['Continue', '12 moves · 4:05', 'Draw 1', 'New Deal', 'Ends the game in progress'].map((text) => drawn().indexOf(text))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    await fireEvent.press(screen.getByText('Continue'))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(mockAbandon).not.toHaveBeenCalled()
  })

  // Jay, 2026-11-21: a way to quit a deal from the setup screen
  it('asks before a new deal ends a game with moves, then counts that game as its own New Game would', async () => {
    const onReady = jest.fn()
    mockMoves = 12
    mockAbandon.mockReturnValue({ moves: 12, elapsedSeconds: 245, config: 3 })
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} onReady={onReady} inProgress progress='12 moves · 4:05' />)

    await fireEvent.press(screen.getByText('New Deal'))
    expect(screen.getByText('Start a New Game?')).toBeTruthy()
    expect(onReady).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.press(screen.getByText('New Game'))
    })
    expect(mockAbandon).toHaveBeenCalledWith('klondike')
    expect(mockRecordAbandoned).toHaveBeenCalledWith('klondike-draw3', { seconds: 245, moves: 12 })
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('leaves the game as it was when the player cancels', async () => {
    const onReady = jest.fn()
    mockMoves = 12
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} onReady={onReady} inProgress progress='12 moves · 4:05' />)
    await fireEvent.press(screen.getByText('New Deal'))
    await act(async () => {
      fireEvent.press(screen.getByText('Cancel'))
    })
    expect(mockAbandon).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
  })

  it("asks nothing over a game with no moves, and doesn't count it", async () => {
    const onReady = jest.fn()
    mockAbandon.mockReturnValue({ moves: 0, elapsedSeconds: 0, config: 1 })
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={klondikeRules()} onReady={onReady} inProgress progress='0 moves · 0:00' />)
    await fireEvent.press(screen.getByText('New Deal'))
    expect(screen.queryByText('Start a New Game?')).toBeNull()
    expect(mockAbandon).toHaveBeenCalledWith('klondike')
    expect(mockRecordAbandoned).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it("leaves the game's name to the header", async () => {
    await show(<SolitaireSetup {...optionsProps} game='klondike' rules={[]} inProgress={false} progress={null} />)
    expect(screen.queryByText('Klondike')).toBeNull()
  })

  it('has its dealing row alone for a game without rules', async () => {
    await show(<SolitaireSetup {...optionsProps} game='freecell' rules={[]} inProgress={false} progress={null} />)
    expect(screen.queryByTestId('freecell-rules')).toBeNull()
    expect(within(screen.getByTestId('freecell-random-card')).getByText('New Deal')).toBeTruthy()
  })
})

describe("the setup screen's random deal", () => {
  function wrapper(saves: Record<string, unknown>, player: string | null) {
    const store = configureStore({ reducer: { gameInProgress: () => ({ klondike: saves }), profileSelection: () => ({ 1: player, 2: null }) } })
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={store}>{children}</Provider>
    }
  }
  const options = (loadout: ReturnType<ReturnType<typeof solitaireLoadout>>) => loadout.options(optionsProps) as { props: { inProgress: boolean; progress: string | null } }
  const SAVE = { moves: 12, elapsedSeconds: 245.6 }

  it('has the shell draw no Ready, and deals anew with no game of the player in progress', async () => {
    const { result } = await renderHook(() => solitaireLoadout('klondike')(), { wrapper: wrapper({ dad: SAVE }, null) })
    expect(result.current).toMatchObject({ placesSeats: true, drawsReady: true })
    expect(options(result.current).props).toMatchObject({ inProgress: false, progress: null })
  })

  it("continues the player's own game, saying how far it has got", async () => {
    const { result } = await renderHook(() => solitaireLoadout('klondike')(), { wrapper: wrapper({ dad: SAVE }, 'dad') })
    expect(options(result.current).props).toMatchObject({ inProgress: true, progress: '12 moves · 4:05' })
  })

  // It stays mounted under the play screen, which saves every few moves: nothing there re-renders it for the count
  it("doesn't read how far while the setup screen is covered", async () => {
    mockFocused = false
    const { result } = await renderHook(() => solitaireLoadout('klondike')(), { wrapper: wrapper({ dad: SAVE }, 'dad') })
    expect(options(result.current).props).toMatchObject({ inProgress: true, progress: null })
  })

  it("isn't Continue for a Daily in progress (kept apart from the regular game)", async () => {
    const { result } = await renderHook(() => solitaireLoadout('klondike')(), { wrapper: wrapper({ 'dad#daily': SAVE }, 'dad') })
    expect(options(result.current).props).toMatchObject({ inProgress: false })
  })
})
