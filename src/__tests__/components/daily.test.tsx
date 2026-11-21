import { configureStore } from '@reduxjs/toolkit'
import { FeedbackPressProvider } from '@rific/feedback-press'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import * as RNPaper from 'react-native-paper'
import { Provider as PaperProvider } from 'react-native-paper'
import { Provider } from 'react-redux'

import { DailySettingsSection, OnlineSection } from '@/components/daily/DailySettingsSection'
import { DailyWinSection } from '@/components/daily/DailyWinSection'
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
const mockListed = jest.fn((_listed: boolean, _look: unknown) => Promise.resolve())
jest.mock('@/stores/daily', () => ({
  localDay: () => '2026-11-18',
  startDailyDeal: (game: string) => mockStart(game),
  sendDailyWin: () => mockSend(),
  setDailyListed: (listed: boolean, look: unknown) => mockListed(listed, look),
  fetchDailyBoard: () => Promise.resolve({ entries: [], finished: 4, you: { started: false } }),
  syncDailyLook: () => Promise.resolve(),
  dailyErrorText: (error: Error) => error.message
}))
const mockInfo = jest.fn()
const mockSuccess = jest.fn()
const mockDismissTo = jest.fn()
jest.mock('@rific/toaster', () => ({ useToast: () => ({ info: mockInfo, success: mockSuccess, error: jest.fn() }) }))
// The profiles' players on the device (stores/online.ts), as Settings' ONLINE section reads them: the server knows each as
// "CardTastic", the section names their profiles
const mockRemoveAll = jest.fn()
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
      removeAll: async () => {
        mockRemoveAll()
        players = []
        for (const listener of listeners) listener()
      }
    }
  }
})
jest.mock('expo-router', () => {
  const { useEffect } = require('react')
  return { router: { push: jest.fn() }, useRouter: () => ({ dismissTo: mockDismissTo }), useIsFocused: () => true, useFocusEffect: (run: () => void) => useEffect(run, [run]) }
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
  const store = configureStore({ reducer: { daily }, preloadedState })
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
    await show(<TodaysDeal game='klondike' />)
    expect(screen.getByText('Draw 1 · Clock starts on tap')).toBeTruthy()
    await press('klondike-daily-play')
    expect(mockStart).toHaveBeenCalledWith('klondike')
    expect(router.push).toHaveBeenCalledWith({ pathname: '/play/[game]', params: { game: 'klondike', daily: TODAY } })
  })

  it('says so when the server cannot be reached, and stays put', async () => {
    mockStart.mockRejectedValue(new Error('The Daily needs an internet connection'))
    await show(<TodaysDeal game='klondike' />)
    await press('klondike-daily-play')
    expect(mockInfo).toHaveBeenCalledWith('The Daily needs an internet connection', undefined, undefined, { icon: 'wifi-off' })
    expect(router.push).not.toHaveBeenCalled()
  })

  it('offers a deal already started as running, and counts the wins posted', async () => {
    await show(<TodaysDeal game='klondike' />, { players: { kid: PLAYER }, deals: { kid: { klondike: DEAL } } })
    expect(screen.getByText('Clock is running')).toBeTruthy()
    expect(screen.getByText('4 wins posted')).toBeTruthy()
  })

  it("shows a win's place, and doesn't deal it again", async () => {
    await show(<TodaysDeal game='klondike' />, { players: { kid: { ...PLAYER, listed: true } }, deals: { kid: { klondike: { ...DEAL, result: RESULT } } } })
    expect(screen.getByText('3rd today · Score 210')).toBeTruthy()
    await press('klondike-daily-play')
    expect(mockStart).not.toHaveBeenCalled()
  })

  it("treats yesterday's deal as gone", async () => {
    await show(<TodaysDeal game='klondike' />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, day: '2026-11-17', result: RESULT } } } })
    expect(screen.getByText('Draw 1 · Clock starts on tap')).toBeTruthy()
  })

  it('opens the board', async () => {
    await show(<TodaysDeal game='spider' />)
    await press('spider-daily-board')
    expect(router.push).toHaveBeenCalledWith({ pathname: '/daily/[game]', params: { game: 'spider' } })
  })

  describe('for a guest', () => {
    beforeEach(() => {
      mockProfile = null
    })

    it('asks their name, makes and picks a profile in their color, then deals', async () => {
      mockStart.mockResolvedValue({ ...DEAL })
      await show(<TodaysDeal game='klondike' />)
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
      await show(<TodaysDeal game='spider' />)
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
      await show(<TodaysDeal game='klondike' />)
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

describe('the win card', () => {
  const won = { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, result: RESULT } } } }

  it('asks a profile once, sending its tag and color only with a yes', async () => {
    await show(<DailyWinSection game='klondike' />, won)
    expect(screen.getByText("You'd be 3rd today")).toBeTruthy()
    await press('daily-list-yes')
    expect(mockListed).toHaveBeenCalledWith(true, { tag: 'KID', color: '#3b82f6' })
  })

  it('takes a no', async () => {
    await show(<DailyWinSection game='klondike' />, won)
    await press('daily-list-no')
    expect(mockListed).toHaveBeenCalledWith(false, { tag: 'KID', color: '#3b82f6' })
  })

  it('does not ask again', async () => {
    await show(<DailyWinSection game='klondike' />, { ...won, players: { kid: { ...PLAYER, listed: true } } })
    expect(screen.getByText('3rd today')).toBeTruthy()
    expect(screen.queryByTestId('daily-list-yes')).toBeNull()
  })

  // A Daily is always a profile's (stores/online.ts): Guest has none to show
  it('has nothing for Guest', async () => {
    mockProfile = null
    await show(<DailyWinSection game='klondike' />, won)
    expect(screen.queryByTestId('daily-win-line')).toBeNull()
    expect(screen.queryByTestId('daily-list-yes')).toBeNull()
  })

  it('offers another try when the win could not be sent', async () => {
    mockSend.mockRejectedValueOnce(new Error('offline'))
    await show(<DailyWinSection game='klondike' />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, unsent: ['d'] } } } })
    expect(screen.getByText("Couldn't reach the board")).toBeTruthy()
    await press('daily-win-retry')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('says so when the server refused the run', async () => {
    await show(<DailyWinSection game='klondike' />, { players: { kid: PLAYER }, deals: { kid: { klondike: { ...DEAL, refused: true } } } })
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
    setDailyScope({ game: 'klondike', day: TODAY })
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

describe('Settings', () => {
  it('shows whether this profile shows on the boards, once it has played a Daily, and turns it on', async () => {
    await show(<DailySettingsSection />)
    expect(screen.queryByTestId('daily-listed')).toBeNull()
    await show(<DailySettingsSection />, { players: { kid: PLAYER } })
    expect(screen.getByText('Hidden from everyone')).toBeTruthy()
    await press('daily-listed')
    expect(mockListed).toHaveBeenCalledWith(true, { tag: 'KID', color: '#3b82f6' })
  })

  it("deletes every profile's online data at once, naming the profiles, not the server's name for them", async () => {
    await show(<OnlineSection />)
    expect(screen.getByText('Online as Dad and Kid')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Delete Online Data'))
    })
    expect(screen.getByText("Your profiles' Daily Deal wins come off every board, and their players are deleted from the server. Today's deals start over. This can't be undone.")).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Delete'))
    })
    expect(mockRemoveAll).toHaveBeenCalled()
    expect(mockSuccess).toHaveBeenCalledWith('Online data deleted')
    expect(screen.queryByText('Delete Online Data')).toBeNull()
  })
})
