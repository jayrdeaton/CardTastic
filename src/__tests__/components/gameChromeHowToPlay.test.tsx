import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Provider as PaperProvider } from 'react-native-paper'

import { GameChrome } from '@/components/GameChrome'

// A game's Settings dialog never offers the "How to Play" row: the score counts elapsed seconds, so a
// guide opened mid-deal would cost the player score. Only Home passes the Settings dialog an
// onShowHowToPlay (@tastic/shell's Home, which replays the pack's cards; tested in the package).

const mockSettingsDialog = jest.fn((_props: { visible: boolean; onShowHowToPlay?: () => void }) => null)

jest.mock('@/components/SettingsDialog', () => ({ SettingsDialog: (props: { visible: boolean; onShowHowToPlay?: () => void }) => mockSettingsDialog(props) }))
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ settings: { ...jest.requireActual('@/redux/settingsSlice').DEFAULT_SETTINGS }, setSettings: jest.fn() }) }))
const mockRulesDialog = jest.fn((_props: { visible: boolean; onDismiss: () => void }) => null)
jest.mock('@/components/RulesDialog', () => ({ RulesDialog: (props: { visible: boolean; onDismiss: () => void }) => mockRulesDialog(props) }))
jest.mock('@/components/cardFont', () => ({ CARD_FONT_FAMILY: 'TestSerif' }))

describe('GameChrome: no How to Play row in a game', () => {
  it('renders its Settings dialog without onShowHowToPlay', async () => {
    await render(
      <PaperProvider>
        <GameChrome title='Klondike' onNewGame={jest.fn()} onUndo={jest.fn()} undoDisabled onHint={jest.fn()} autoHintKey={null} hintShowing={false} won={false} winRevealed={false} hasProgress={false} getElapsedSeconds={() => 0} pauseClock={jest.fn()} par={{ moves: 100, seconds: 200, score: 300 }} clockRunning={false} movesCount={0} rules={[]}>
          {null}
        </GameChrome>
      </PaperProvider>
    )

    expect(mockSettingsDialog).toHaveBeenCalled()
    for (const [props] of mockSettingsDialog.mock.calls) {
      expect(props.onShowHowToPlay).toBeUndefined()
    }
  })
})

describe('GameChrome: the clock is held while a dialog is open', () => {
  it('pauses the clock while Rules is open and releases it on close', async () => {
    const pauseClock = jest.fn()
    await render(
      <PaperProvider>
        <GameChrome title='Klondike' onNewGame={jest.fn()} onUndo={jest.fn()} undoDisabled onHint={jest.fn()} autoHintKey={null} hintShowing={false} won={false} winRevealed={false} hasProgress={false} getElapsedSeconds={() => 0} pauseClock={pauseClock} par={{ moves: 100, seconds: 200, score: 300 }} clockRunning={false} movesCount={0} rules={[]}>
          {null}
        </GameChrome>
      </PaperProvider>
    )
    expect(pauseClock).toHaveBeenLastCalledWith('dialog', false)
    await act(async () => fireEvent.press(screen.getByLabelText('Klondike rules')))
    expect(pauseClock).toHaveBeenLastCalledWith('dialog', true)
    await act(async () => mockRulesDialog.mock.calls.at(-1)![0].onDismiss())
    expect(pauseClock).toHaveBeenLastCalledWith('dialog', false)
  })
})
