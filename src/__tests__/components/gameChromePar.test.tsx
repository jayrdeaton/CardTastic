import { FeedbackPressProvider } from '@rific/feedback-press'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Provider as PaperProvider } from 'react-native-paper'

import { GameChrome } from '@/components/GameChrome'
import type { PlayerPar } from '@/engine/par'

// Par was only ever seen on the win card (Chris, a friend of Jay's, 2026-11-17, wanted it clearer), and Jay wanted
// nothing more in the bottom band: holding the score shows the player's par in a toast. Upright a tap still shows and
// hides the controls; sideways, where the readout hides nothing, a tap shows the par too.

jest.mock('@/components/SettingsDialog', () => ({ SettingsDialog: () => null }))
jest.mock('@/components/RulesDialog', () => ({ RulesDialog: () => null }))
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ settings: { ...jest.requireActual('@/redux/settingsSlice').DEFAULT_SETTINGS }, setSettings: jest.fn() }) }))
jest.mock('@/components/cardFont', () => ({ CARD_FONT_FAMILY: 'TestSerif' }))

let mockPar: { par: PlayerPar; wins: number }
const mockGetPlayerPar = jest.fn((_variant: string) => mockPar)
jest.mock('@/stores/gameStats', () => ({ useGameStats: () => ({ getPlayerPar: mockGetPlayerPar }) }))
const mockInfo = jest.fn()
jest.mock('@rific/toaster', () => ({ useToast: () => ({ info: mockInfo }) }))

let mockWindow = { width: 402, height: 874 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ({ ...mockWindow, scale: 1, fontScale: 1 }) }))

const personal = (score: number, wins: number) => ({ par: { kind: 'personal' as const, moves: 120, seconds: 255, score, goldScore: null }, wins })

async function renderChrome({ won = false } = {}) {
  const click = jest.fn()
  const invalid = jest.fn()
  await render(
    <PaperProvider>
      <FeedbackPressProvider soundInitialValue={{ enabled: true }} sound={{ selection: click, notification: invalid }}>
        <GameChrome title='Klondike' onNewGame={jest.fn()} onUndo={jest.fn()} undoDisabled={false} onHint={jest.fn()} autoHintKey={null} hintShowing={false} won={won} winRevealed={false} hasProgress={false} getElapsedSeconds={() => 0} pauseClock={jest.fn()} variant='klondike-draw3' clockRunning={false} movesCount={0} rules={[]}>
          {null}
        </GameChrome>
      </FeedbackPressProvider>
    </PaperProvider>
  )
  return { click, invalid }
}

beforeEach(() => {
  mockWindow = { width: 402, height: 874 }
  mockPar = personal(1240, 12)
  mockGetPlayerPar.mockClear()
  mockInfo.mockClear()
})

describe('GameChrome: holding the score, upright', () => {
  it("shows the player's par for the deal's rule set, and what it is, with no sound of its own", async () => {
    const { invalid } = await renderChrome()

    await act(async () => fireEvent(screen.getByTestId('scoreboard'), 'longPress'))

    expect(mockGetPlayerPar).toHaveBeenCalledWith('klondike-draw3')
    expect(mockInfo).toHaveBeenCalledWith('Your par is 1,240', 'Middle of last 12 wins', undefined, { icon: 'golf' })
    // feedback-press's default long press plays 'notification', which this app maps to the invalid-move sound.
    expect(invalid).not.toHaveBeenCalled()
    // A hold doesn't also tuck the controls away.
    expect(screen.getByLabelText('Hide controls')).toBeTruthy()
  })

  it('says so when the par comes from one win, or is expert par before any', async () => {
    await renderChrome()
    mockPar = personal(400, 1)
    await act(async () => fireEvent(screen.getByTestId('scoreboard'), 'longPress'))
    expect(mockInfo).toHaveBeenLastCalledWith('Your par is 400', 'From your one win so far', undefined, { icon: 'golf' })

    mockPar = { par: { kind: 'expert', moves: 120, seconds: 200, score: 320, goldScore: null }, wins: 0 }
    await act(async () => fireEvent(screen.getByTestId('scoreboard'), 'longPress'))
    expect(mockInfo).toHaveBeenLastCalledWith('Expert par is 320', 'Win one to set your own', undefined, { icon: 'golf' })
  })

  it('still shows and hides the controls on a tap, with no par', async () => {
    await renderChrome()

    await act(async () => fireEvent.press(screen.getByTestId('scoreboard')))

    expect(screen.getByLabelText('Show controls')).toBeTruthy()
    expect(mockInfo).not.toHaveBeenCalled()
  })

  it('does nothing on a won deal', async () => {
    await renderChrome({ won: true })

    await act(async () => fireEvent(screen.getByTestId('scoreboard'), 'longPress'))

    expect(mockInfo).not.toHaveBeenCalled()
  })
})

describe('GameChrome: the score sideways', () => {
  it('shows the par on a tap as well as a hold', async () => {
    mockWindow = { width: 874, height: 402 }
    await renderChrome()

    await act(async () => fireEvent.press(screen.getByTestId('scoreboard')))
    expect(mockInfo).toHaveBeenCalledTimes(1)
    await act(async () => fireEvent(screen.getByTestId('scoreboard'), 'longPress'))
    expect(mockInfo).toHaveBeenCalledTimes(2)
    expect(mockInfo).toHaveBeenLastCalledWith('Your par is 1,240', 'Middle of last 12 wins', undefined, { icon: 'golf' })
  })
})
