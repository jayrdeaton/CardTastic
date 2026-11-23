import { configureStore } from '@reduxjs/toolkit'
import { useAutoPaperTheme } from '@rific/auto-paper'
import { FeedbackPressProvider } from '@rific/feedback-press'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import * as RNPaper from 'react-native-paper'
import { Provider as PaperProvider } from 'react-native-paper'
import { Provider } from 'react-redux'

import { DailyBoardScreen } from '@/components/daily/DailyBoardScreen'
import { DailyWinSection } from '@/components/daily/DailyWinSection'
import { ProfileOnline } from '@/components/daily/ProfileOnline'
import { TodaysDeal } from '@/components/daily/TodaysDeal'
import { GameChrome } from '@/components/GameChrome'
import daily, { type DailyDeal, type DailyPlayer, type DailyState } from '@/redux/dailySlice'
import { setDailyScope } from '@/stores/dailyScope'

// What a player sees of the Daily Deals: the setup screen's card, the win card's question, and a Daily's game footer.

const TODAY = '2026-11-18'
let mockProfile: { id: string; tag: string } | null = { id: 'kid', tag: 'KID' }
const mockSelect = jest.fn()
const mockCreate = jest.fn((input: { name: string; color: string; tag: string }) => ({ id: 'made', ...input }))
jest.mock('@/stores/profiles', () => ({
  usePlayer: () => ({ profile: mockProfile, profileId: mockProfile?.id ?? null, color: '#3b82f6', select: mockSelect }),
  useProfiles: () => ({ createProfile: mockCreate })
}))
const mockStart = jest.fn()
const mockSend = jest.fn(() => Promise.resolve())
const mockListed = jest.fn((_listed: boolean, _look: unknown, _owner?: string) => Promise.resolve())
let mockBoard: unknown = { entries: [], finished: 4, you: { started: false } }
jest.mock('@/stores/daily', () => ({
  localDay: () => '2026-11-18',
  startDailyDeal: (game: string) => mockStart(game),
  sendDailyWin: () => mockSend(),
  setDailyListed: (...args: [boolean, unknown, string?]) => mockListed(...args),
  fetchDailyBoard: () => Promise.resolve(mockBoard),
  syncDailyLook: () => Promise.resolve(),
  dailyErrorText: (error: Error) => error.message
}))
const mockInfo = jest.fn()
const mockSuccess = jest.fn()
const mockSeeBoard = jest.fn()
const mockDismissTo = jest.fn()
jest.mock('@rific/toaster', () => ({ useToast: () => ({ info: mockInfo, success: mockSuccess, error: jest.fn() }) }))
// The profiles' players on the device (stores/online.ts), as Settings' ONLINE section reads them: the server knows each as
// "CardTastic", the section names their profiles
const mockRemove = jest.fn()
jest.mock('@/stores/online', () => {
  let players = [
    { profileId: 'dad', id: 'p1', token: 't1', name: 'CardTastic', profileName: 'Dad' },
    { profileId: 'kid', id: 'p2', token: 't2', name: 'CardTastic', profileName: 'Kid' }
  ]
  const listeners = new Set<() => void>()
  return {
    online: {
      load: async () => {},
      players: () => players,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      remove: async (profileId: string) => {
        mockRemove(profileId)
        players = players.filter((player) => player.profileId !== profileId)
        for (const listener of listeners) listener()
      }
    }
  }
})
jest.mock('expo-router', () => {
  const { useEffect } = require('react')
  return { router: { push: jest.fn() }, useRouter: () => ({ dismissTo: mockDismissTo }), useLocalSearchParams: () => ({ game: 'freecell' }), useIsFocused: () => true, useFocusEffect: (run: () => void) => useEffect(run, [run]) }
})
jest.mock('@/components/SettingsDialog', () => ({ SettingsDialog: () => null }))
jest.mock('@/components/RulesDialog', () => ({ RulesDialog: () => null }))
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ settings: { ...jest.requireActual('@/redux/settingsSlice').DEFAULT_SETTINGS, autoHintSeconds: 0 }, setSettings: jest.fn() }) }))
jest.mock('@/components/cardFont', () => ({ CARD_FONT_FAMILY: 'TestSerif' }))
jest.mock('@/stores/gameStats', () => ({ useGameStats: () => ({ getPlayerPar: jest.fn() }) }))

const PLAYER: DailyPlayer = { player: 'p', listed: null, shownTag: null, shownColor: null }
const DEAL: DailyDeal = { day: TODAY, seed: 7, startedAt: '', result: null, unsent: null, refused: false }
const RESULT = { moves: 120, seconds: 90, score: 210, rank: 3 }

async function show(element: ReactNode, state: Partial<DailyState> = {}) {
  const preloadedState = { daily: { players: {}, deals: {}, playing: null, ...state } }
  // The color a profile plays under: a pick for Kid
  const store = configureStore({ reducer: { daily, seatColors: () => ({ profileColors: { kid: { color: '#ff9800', profileColor: '#3b82f6' } } }) }, preloadedState })
  await render(
    <Provider store={store}>
      <PaperProvider>
        <FeedbackPressProvider paper={RNPaper} soundInitialValue={{ enabled: false }}>
          {element}
        </FeedbackPressProvider>
      </PaperProvider>
    </Provider>
  )
  await act(async () => {})
}

const press = (testID: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(testID))
  })

beforeEach(() => {
  mockProfile = { id: 'kid', tag: 'KID' }
  jest.clearAllMocks()
})

describe("Today's Deal", () => {
  it('starts the deal and opens it, saying the clock starts on the tap', async () => {
    mockStart.mockResolvedValue({ ...DEAL })
    await show(<TodaysDeal game='klondike' day={TODAY} />)
    expect(screen.getByText('Draw 1 · Clock starts on tap')).toBeTruthy()
    await press('klondike-daily-play')
    expect(mockStart).toHaveBeenCalledWith('klondike')
    expect(router.push).toHaveBeenCalledWith({ pathname: '/play/[game]', params: { game: 'klondike', daily: TODAY } })
  })

  it('says so when the server cannot be reached, and stays put', async () => {
    mockStart.mockRejectedValue(new Error('The Daily needs an internet connection'))
    await show(<TodaysDeal game='klondike' day={TODAY} />)
    await press('klondike-daily-play')
    expect(mockInfo).toHaveBeenCalledWith('The Daily needs an internet connection', undefined, undefined, { icon: 'wifi-off' })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('offers a deal already started as running, and counts the wins posted', async () => {
    await show(<TodaysDeal game='klondike' day={TODAY} />, { players: { kid: PLAYER }, deals: { kid: { klondike: DEAL } } })
    expect(screen.getByText('Clock is running')).toBeTruthy()
    expect(screen.getByText('4 wins posted')).toBeTruthy()
  })

  // Jay, 2026-11-21: a finished Daily didn't look done
  it("checks a won deal off with its place, and doesn't deal it again", async () => {
    await show(<TodaysDeal game='klondike' day={TODAY} />, { players: { kid: { ...PLAYER, listed: true } }, deals: { kid: { klondike: { ...DEAL, result: RESULT } } } })
    expect(screen.getByText('Done · 3rd · Score 210')).toBeTruthy()
    expect(screen.getByTestId('klondike-daily-play-done')).toBeTruthy()
    const badge = StyleSheet.flatten(screen.getByTestId('klondike-daily-play-done').props.style).backgroundColor
    await press('klondike-daily-play')
    expect(mockStart).not.toHaveBeenCalled()
    // Filled in the theme's tertiary, the on badge one step stronger, never auto-paper's fixed success green (Jay, 2026-11-23).
    // Read last: renderHook mounts a tree of its own, which screen then points at
    const { result } = await renderHook(() => useAutoPaperTheme())
    expect(badge).toBe(result.current.colors.tertiary)
    expect(badge).not.toBe(result.current.colors.success)
  })

  it("says where a win would stand for a player who isn't on the boards", async () => {
    await show(<TodaysDeal game='klondike' day={TODAY} />, { players: { kid: { ...PLAYER, listed: false } }, deals: { kid: { klondike: { ...DEAL, result: RESULT } } } })
    expect(screen.getByText("Done · You'd be 3rd · Score 210")).toBeTruthy()
  })

  it('checks off a win still on its way to the board too', async () => {
    await show(<TodaysDeal game='klondike' day={TODAY} />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, unsent: ['d'] } } } })
    expect(screen.getByText('Won · Posting your win')).toBeTruthy()
    expect(screen.getByTestId('klondike-daily-play-done')).toBeTruthy()
  })

  it("treats yesterday's deal as gone", async () => {
    await show(<TodaysDeal game='klondike' day={TODAY} />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, day: '2026-11-17', result: RESULT } } } })
    expect(screen.getByText('Draw 1 · Clock starts on tap')).toBeTruthy()
  })

  it('opens the board', async () => {
    await show(<TodaysDeal game='spider' day={TODAY} />)
    await press('spider-daily-board')
    expect(router.push).toHaveBeenCalledWith({ pathname: '/daily/[game]', params: { game: 'spider' } })
  })

  describe('for a guest', () => {
    beforeEach(() => {
      mockProfile = null
    })

    it('asks their name, makes and picks a profile in their color, then deals', async () => {
      mockStart.mockResolvedValue({ ...DEAL })
      await show(<TodaysDeal game='klondike' day={TODAY} />)
      await press('klondike-daily-play')
      expect(mockStart).not.toHaveBeenCalled()
      expect(screen.getByText("Who's Playing?")).toBeTruthy()
      expect(screen.getByTestId('daily-name-play')).toBeDisabled()
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('daily-name-input'), '  emma ')
      })
      await press('daily-name-play')
      expect(mockCreate).toHaveBeenCalledWith({ name: 'emma', color: '#3b82f6', tag: 'E' })
      expect(mockSelect).toHaveBeenCalledWith('made')
      expect(mockStart).toHaveBeenCalledWith('klondike')
      expect(router.push).toHaveBeenCalledWith({ pathname: '/play/[game]', params: { game: 'klondike', daily: TODAY } })
      expect(screen.queryByText("Who's Playing?")).toBeNull()
    })

    it('asks before the board too', async () => {
      await show(<TodaysDeal game='spider' day={TODAY} />)
      await press('spider-daily-board')
      expect(router.push).not.toHaveBeenCalled()
      expect(screen.getByText('Continue')).toBeTruthy()
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('daily-name-input'), 'Sam')
      })
      await press('daily-name-play')
      expect(mockCreate).toHaveBeenCalledWith({ name: 'Sam', color: '#3b82f6', tag: 'S' })
      expect(router.push).toHaveBeenCalledWith({ pathname: '/daily/[game]', params: { game: 'spider' } })
    })

    it('makes nothing when they cancel', async () => {
      await show(<TodaysDeal game='klondike' day={TODAY} />)
      await press('klondike-daily-play')
      await act(async () => {
        fireEvent.press(screen.getByText('Cancel'))
      })
      expect(screen.queryByText("Who's Playing?")).toBeNull()
      expect(mockCreate).not.toHaveBeenCalled()
      expect(mockStart).not.toHaveBeenCalled()
    })
  })
})

describe("Today's Board", () => {
  // Jay, 2026-11-23: his row was an opaque pale magenta (the theme's tertiaryContainer, for a yellow player) right up to the
  // rank and the moves. Now it's outlined in his own color, with room round the columns
  it('outlines your row in your own color, and no one else', async () => {
    mockBoard = {
      entries: [
        { rank: 1, score: 187, seconds: 90, moves: 97, tag: '🦄', color: '#9c27b0', you: false },
        { rank: 2, score: 690, seconds: 538, moves: 152, tag: '🐲', color: '#ffeb3b', you: true }
      ],
      finished: 2,
      you: { started: true, listed: true, rank: 2, score: 690, seconds: 538, moves: 152, tag: '🐲', color: '#ffeb3b', you: true }
    }
    await show(<DailyBoardScreen />)
    const outlines = screen.getAllByTestId('daily-board-you-outline')
    expect(outlines).toHaveLength(1)
    const outline = StyleSheet.flatten(outlines[0].props.style)
    expect(outline.borderColor).toBe('#ffeb3b')
    expect(outline.borderWidth).toBe(2)
    expect(outline.backgroundColor).toBeUndefined()
    expect(StyleSheet.flatten(screen.getByTestId('daily-board-you').props.style).paddingHorizontal).toBeGreaterThanOrEqual(12)
  })
})

describe('the win card', () => {
  const won = { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, result: RESULT } } } }

  // Jay, 2026-11-21: one filled button and a muted one, never a second in the primary, and words for what the answer does
  // (it was Not Now and Show Me, under a See Board button of its own)
  it('asks a profile once, its own two buttons on the card, sending its tag and color only with a yes', async () => {
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, won)
    expect(screen.getByText("You'd be 3rd today")).toBeTruthy()
    expect(screen.getByTestId('daily-list-no')).toHaveTextContent('Keep Private')
    expect(screen.getByTestId('daily-list-yes')).toHaveTextContent('Show My Wins')
    expect(screen.queryByTestId('win-see-board')).toBeNull()
    await press('daily-list-yes')
    expect(mockListed).toHaveBeenCalledWith(true, { tag: 'KID', color: '#3b82f6' })
  })

  it('takes a no', async () => {
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, won)
    await press('daily-list-no')
    expect(mockListed).toHaveBeenCalledWith(false, { tag: 'KID', color: '#3b82f6' })
  })

  it('does not ask again, and ends in the board', async () => {
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, { ...won, players: { kid: { ...PLAYER, listed: true } } })
    expect(screen.getByText('3rd today')).toBeTruthy()
    expect(screen.queryByTestId('daily-list-yes')).toBeNull()
    await press('win-see-board')
    expect(mockSeeBoard).toHaveBeenCalled()
  })

  // A Daily belongs to the date its clock started (Jay, 2026-11-21: midnight stays the turn of the day), so one dealt before
  // midnight and won after it stands on its own date's board
  it("names the deal's date when it was dealt before today", async () => {
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, { players: { kid: { ...PLAYER, listed: true } }, deals: { kid: { klondike: { ...DEAL, day: '2026-11-17', result: RESULT } } } })
    expect(screen.getByText('3rd on Nov 17')).toBeTruthy()
  })

  // A Daily is always a profile's (stores/online.ts): Guest has none to show
  it('has nothing for Guest but the board', async () => {
    mockProfile = null
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, won)
    expect(screen.queryByTestId('daily-win-line')).toBeNull()
    expect(screen.queryByTestId('daily-list-yes')).toBeNull()
    expect(screen.getByTestId('win-see-board')).toBeTruthy()
  })

  it('offers another try when the win could not be sent, beside the board', async () => {
    mockSend.mockRejectedValueOnce(new Error('offline'))
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, unsent: ['d'] } } } })
    expect(screen.getByText("Couldn't reach the board")).toBeTruthy()
    expect(screen.getByTestId('win-see-board')).toBeTruthy()
    await press('daily-win-retry')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('says so when the server refused the run', async () => {
    await show(<DailyWinSection game='klondike' onSeeBoard={mockSeeBoard} />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, refused: true } } } })
    expect(screen.getByText("This run couldn't be verified, so it isn't on the board")).toBeTruthy()
  })
})

describe('a Daily Deal in the game footer', () => {
  const chrome = (
    <GameChrome title='Klondike' onNewGame={jest.fn()} onUndo={jest.fn()} undoDisabled={false} onHint={jest.fn()} autoHintKey={null} hintShowing={false} won={false} winRevealed={false} hasProgress={false} getElapsedSeconds={() => 0} pauseClock={jest.fn()} variant='klondike' clockRunning={false} movesCount={0} rules={[]}>
      {null}
    </GameChrome>
  )

  afterEach(() => setDailyScope(null))

  it('leaves Undo, with no Hint and no New Game', async () => {
    setDailyScope({ game: 'klondike', day: TODAY, seed: 1 })
    await show(chrome)
    expect(screen.getByText('Klondike · Daily Deal')).toBeTruthy()
    expect(screen.getByText('Undo')).toBeTruthy()
    expect(screen.queryByText('Hint')).toBeNull()
    expect(screen.queryByText('New Game')).toBeNull()
  })

  it("goes back to the game's setup screen", async () => {
    await show(chrome)
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Back'))
    })
    expect(mockDismissTo).toHaveBeenCalledWith({ pathname: '/loadout/[game]', params: { game: 'klondike' } })
    expect(screen.queryByLabelText('Home')).toBeNull()
  })

  it('keeps them all in a regular game', async () => {
    await show(chrome)
    expect(screen.getByText('Hint')).toBeTruthy()
    expect(screen.getByText('New Game')).toBeTruthy()
  })
})

// A profile's ONLINE section on its Edit Profile screen (the pack's ProfileSections)
describe('Edit Profile', () => {
  const KID = { id: 'kid', name: 'Kid', tag: 'KID', color: '#3b82f6', createdAt: 0, updatedAt: 0 }
  const SAM = { id: 'sam', name: 'Sam', tag: 'S', color: '#4caf50', createdAt: 0, updatedAt: 0 }

  it('has nothing for a profile that has never played online', async () => {
    await show(<ProfileOnline profile={SAM} />)
    expect(screen.queryByText('Delete Online Data')).toBeNull()
  })

  it('shows whether this profile shows on the boards, once it has played a Daily, sending the color it plays under with a yes', async () => {
    await show(<ProfileOnline profile={KID} />)
    expect(screen.queryByTestId('daily-listed')).toBeNull()
    await show(<ProfileOnline profile={KID} />, { players: { kid: PLAYER } })
    expect(screen.getAllByText(/^(ONLINE|Show on Public Boards|Delete Online Data)$/).map((node) => node.props.children)).toEqual(['ONLINE', 'Show on Public Boards', 'Delete Online Data'])
    expect(screen.getByText('Hidden from everyone')).toBeTruthy()
    await press('daily-listed')
    expect(mockListed).toHaveBeenCalledWith(true, { tag: 'KID', color: '#ff9800' }, 'kid')
  })

  it("deletes this profile's online data, keeping the profile", async () => {
    await show(<ProfileOnline profile={KID} />)
    await press('profile-online-delete')
    expect(screen.getByText("Kid's Daily Deal wins come off every board, and their player is deleted from the server. The profile stays, and today's deals start over. This can't be undone.")).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Delete'))
    })
    expect(mockRemove).toHaveBeenCalledWith('kid')
    expect(mockSuccess).toHaveBeenCalledWith('Online data deleted')
    expect(screen.queryByText('Delete Online Data')).toBeNull()
  })
})
