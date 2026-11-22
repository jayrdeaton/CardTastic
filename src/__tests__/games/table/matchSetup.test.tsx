import type { LoadoutOptionsProps } from '@tastic/shell'
import { fireEvent, render, renderHook, screen } from '@testing-library/react-native'
import { Text } from 'react-native'

import { EIGHTS_RULE_KEYS, eightsRuleSettings } from '@/games/crazyeights/ruleSettings'
import { MatchSetup } from '@/games/table/MatchSetup'
import { useNextRound } from '@/games/table/useNextRound'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'

// A two-player game's setup screen (Jay, 2026-11-10: "both places"): who's playing, then its rules as the same row the
// Settings sheet has, a tap sliding every rule's choices open right there (2026-11-21). Seats 3 and 4 stay pills, since
// they're players. The game's name is the shell's header's, but in 2 Player face to face, whose band names it here.
// And a Rematch takes the rules from Settings as they are when it's pressed (games/table/useNextRound.ts).

const mockDispatch = jest.fn()
let mockSettings = { ...DEFAULT_SETTINGS }

jest.mock('@tastic/shell', () => ({
  liveplayActions: { setActiveRound: (round: object) => ({ type: 'liveplay/setActiveRound', payload: round }) }
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
  mockDispatch.mockClear()
  mockSettings = { ...DEFAULT_SETTINGS }
})

describe('MatchSetup', () => {
  it("puts who's playing first: the seat buttons right under the game's name, above its rules", async () => {
    await render(<MatchSetup {...optionsProps} game='crazyeights' title='Crazy Eights' rules={eightsRuleSettings(DEFAULT_SETTINGS, jest.fn())} seats={<Text>Who is playing</Text>} />)
    const drawn = JSON.stringify(screen.toJSON())
    expect(drawn.indexOf('Crazy Eights')).toBeLessThan(drawn.indexOf('Who is playing'))
    expect(drawn.indexOf('Who is playing')).toBeLessThan(drawn.indexOf('Rules'))
  })

  it("leaves the game's name to the shell's header wherever it has one", async () => {
    await render(<MatchSetup {...optionsProps} titleShown game='crazyeights' title='Crazy Eights' rules={eightsRuleSettings(DEFAULT_SETTINGS, jest.fn())} />)
    expect(screen.queryByText('Crazy Eights')).toBeNull()
  })

  it('names the game and shows its rules as one row saying every choice in effect, as in Settings', async () => {
    await render(<MatchSetup {...optionsProps} game='crazyeights' title='Crazy Eights' rules={eightsRuleSettings(DEFAULT_SETTINGS, jest.fn())} />)

    expect(screen.getByText('Crazy Eights')).toBeTruthy()
    expect(screen.getByTestId('crazyeights-rules')).toBeTruthy()
    expect(screen.getByText('Keep Drawing · Only 8s · 7 Cards, 5 for 3+')).toBeTruthy()
  })

  it('slides every rule open right there, and a pick writes the setting the Settings sheet shows', async () => {
    const setSettings = jest.fn()
    await render(<MatchSetup {...optionsProps} game='crazyeights' title='Crazy Eights' rules={eightsRuleSettings(DEFAULT_SETTINGS, setSettings)} />)

    expect(screen.queryByText('2s Draw Two')).toBeNull()
    await fireEvent.press(screen.getByText('Rules'))
    for (const label of ['When Nothing Fits', 'Special Cards', 'Hand Size']) expect(screen.getByText(label)).toBeTruthy()
    await fireEvent.press(screen.getByText('2s Draw Two'))
    expect(setSettings).toHaveBeenCalledWith({ eightsSpecials: 'twos' })
  })

  it('has no card for a game without rules', async () => {
    await render(<MatchSetup {...optionsProps} game='war' title='War' rules={[]} />)

    expect(screen.getByText('War')).toBeTruthy()
    expect(screen.queryByTestId('war-rules')).toBeNull()
  })

  it("keeps seats 3 and 4 on the setup screen as pills, since they're who's playing", async () => {
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
