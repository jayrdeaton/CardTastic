import type { LoadoutOptionsProps } from '@tastic/shell'
import { fireEvent, render, renderHook, screen } from '@testing-library/react-native'

import { EIGHTS_RULE_KEYS, eightsRuleSettings } from '@/games/crazyeights/ruleSettings'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useNextRound } from '@/games/table/useNextRound'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'

// A two-player game's setup screen (Jay, 2026-11-08): the game's name and its house rules in effect on one line, which
// opens the Settings sheet where they're changed; the rules themselves are never on the setup screen. And a Rematch
// takes the rules from Settings as they are when it's pressed (games/table/useNextRound.ts).

const mockOpenFor = jest.fn()
const mockDispatch = jest.fn()
let mockSettings = { ...DEFAULT_SETTINGS }

jest.mock('@tastic/shell', () => ({
  useGameGuide: () => ({ openFor: mockOpenFor }),
  liveplayActions: { setActiveRound: (round: object) => ({ type: 'liveplay/setActiveRound', payload: round }) }
}))
jest.mock('@/components/SettingsDialog', () => ({
  SettingsDialog: ({ visible, onShowHowToPlay }: { visible: boolean; onShowHowToPlay: () => void }) => {
    const { Text: MockText } = jest.requireActual('react-native')
    return visible ? (
      <MockText testID='settings-sheet' onPress={onShowHowToPlay}>
        Settings
      </MockText>
    ) : null
  }
}))
jest.mock('@/games/table/RulePickers', () => ({
  RulePickers: ({ rules }: { rules: { key: string }[] }) => {
    const { Text: MockText } = jest.requireActual('react-native')
    return rules.map((rule) => <MockText key={rule.key}>{`seat pill ${rule.key}`}</MockText>)
  }
}))
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ settings: mockSettings, setSettings: jest.fn() }) }))
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }))

const optionsProps = { host: { openId: null, open: jest.fn(), close: jest.fn(), toggle: jest.fn() }, accentColor: '#fff', mutedColor: '#888', onAccentColor: '#000', dark: true } as unknown as LoadoutOptionsProps

beforeEach(() => {
  mockOpenFor.mockClear()
  mockDispatch.mockClear()
  mockSettings = { ...DEFAULT_SETTINGS }
})

describe('MatchSetup', () => {
  it("names the game and sums its house rules up, opening Settings (with this game's How to Play) on a tap", async () => {
    await render(<MatchSetup {...optionsProps} game='crazyeights' title='Crazy Eights' rules={eightsRuleSettings(DEFAULT_SETTINGS, jest.fn())} />)

    expect(screen.getByText('Crazy Eights')).toBeTruthy()
    for (const choice of ['Keep Drawing', 'Only 8s', '7 Cards, 5 for 3+']) expect(screen.getByText(choice)).toBeTruthy()
    expect(screen.queryByTestId('settings-sheet')).toBeNull()

    await fireEvent.press(screen.getByText('Only 8s'))
    expect(screen.getByTestId('settings-sheet')).toBeTruthy()
    await fireEvent.press(screen.getByTestId('settings-sheet'))
    expect(mockOpenFor).toHaveBeenCalledWith('crazyeights')
  })

  it("keeps seats 3 and 4 on the setup screen, since they're who's playing", async () => {
    await render(<MatchSetup {...optionsProps} game='crazyeights' title='Crazy Eights' rules={[]} extraSeats={[{ key: 'seat3', icon: 'account', value: 'off', choices: [], onChange: jest.fn() }]} />)

    expect(screen.getByText('seat pill seat3')).toBeTruthy()
  })
})

describe('useNextRound', () => {
  it('takes the rules from Settings as they are now, keeps who is playing, and commits that as the round', async () => {
    const round = { eightsCpu: 'easy' as const, eightsSeat3: 'cpu' as const, eightsSeat4: 'off' as const, eightsDraw: 'untilPlayable' as const, eightsSpecials: 'eights' as const, eightsHand: 'byPlayers' as const }
    // Changed in Settings mid-game: a rule, and (not a rule) the CPU's level.
    mockSettings = { ...DEFAULT_SETTINGS, eightsSpecials: 'action', eightsCpu: 'hard' }
    const { result } = await renderHook(() => useNextRound('crazyeights', 'vsCpu', round, EIGHTS_RULE_KEYS))

    const next = result.current()
    expect(next).toEqual({ ...round, eightsSpecials: 'action' })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'liveplay/setActiveRound', payload: { game: 'crazyeights', mode: 'vsCpu', settings: next } })
  })
})
