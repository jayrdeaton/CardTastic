import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native'

import { RULES_EXPAND_MS } from '@/components/RuleRows'
import { SettingsSections, useSettingsRules } from '@/components/SettingsSections'

// Solitaire's own Settings rows (Jay, 2026-10-15): two labeled sections like hud's APPEARANCE, so no
// bare gap follows the Blur row, and Auto Hint's choice is the row's caption like every other row's.

const mockSetSettings = jest.fn()
let mockAutoHintSeconds = 0

jest.mock('@/hooks/useSettings', () => {
  const { DEFAULT_SETTINGS } = jest.requireActual('@/redux/settingsSlice')
  return { useSettings: () => ({ settings: { ...DEFAULT_SETTINGS, autoHintSeconds: mockAutoHintSeconds }, setSettings: mockSetSettings }) }
})
jest.mock('@/components/theme', () => {
  const actual = jest.requireActual('@/components/theme')
  return { ...actual, useTableColors: () => actual.lightColors }
})
jest.mock('@/components/cardFont', () => ({ CARD_FONT_FAMILY: 'TestSerif' }))
// The Monogram back's preview shows the selected player's tag; a guest has none.
jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ profile: null }) }))
// The sheet shows the rules of the game it's opened in, found from the route.
let mockPath = '/'
jest.mock('expo-router', () => ({ usePathname: () => mockPath }))

beforeEach(() => {
  mockSetSettings.mockClear()
  mockAutoHintSeconds = 0
  mockPath = '/'
})

// The sheet as @tastic/shell lays it out: the game's rules first (the pack's useSettingsRules), its own rows (left out
// here), then Solitaire's sections.
function Sheet() {
  const rules = useSettingsRules()
  return (
    <>
      {rules}
      <SettingsSections />
    </>
  )
}

async function renderSections() {
  await render(<Sheet />)
}

describe("Solitaire's own Settings sections", () => {
  it('labels the gameplay rows and the card rows', async () => {
    await renderSections()

    expect(screen.getByText('GAMEPLAY')).toBeTruthy()
    expect(screen.getByText('CARDS')).toBeTruthy()
  })

  it("shows Auto Hint's choice as the row's caption, and slides its choices open on a tap, open until tapped again", async () => {
    await renderSections()
    expect(screen.getByText('Off')).toBeTruthy()
    expect(screen.queryByText('After 15 seconds')).toBeNull()

    await fireEvent.press(screen.getByText('Auto Hint'))
    await fireEvent.press(screen.getByText('After 15 seconds'))
    expect(mockSetSettings).toHaveBeenCalledWith({ autoHintSeconds: 15 })
    // Picking one leaves them open, so another can be picked
    expect(screen.getByText('After 15 seconds')).toBeTruthy()
    // A tap on the row slides them shut, and they go once they have
    await fireEvent.press(screen.getByText('Auto Hint'))
    await act(() => new Promise((resolve) => setTimeout(resolve, RULES_EXPAND_MS + 20)))
    expect(screen.queryByText('After 15 seconds')).toBeNull()
  })

  it('spells the wait out in the caption', async () => {
    mockAutoHintSeconds = 30
    await renderSections()

    expect(screen.getByText('After 30 seconds')).toBeTruthy()
  })
})

// Jay, 2026-11-08: every game's rules live in the Settings sheet, the solitaire games' and the two-player games' alike,
// each a row naming the rule with the choice in effect under it, and a line saying a change waits for the next game.
// Since 2026-11-10 they lead the sheet, above the shell's own rows (the pack's useSettingsRules).
describe("the game's rules in Settings", () => {
  it('has no rules on Home, so nothing leads the sheet there', async () => {
    await renderSections()
    const { result } = await renderHook(() => useSettingsRules())
    expect(result.current).toBeNull()

    expect(screen.queryByText('Applies to next game')).toBeNull()
    expect(screen.queryByText('KLONDIKE')).toBeNull()
  })

  it("shows a solitaire game's rules in its own section above Gameplay, waiting for the next game", async () => {
    mockPath = '/play/klondike'
    await renderSections()

    expect(screen.getByText('KLONDIKE')).toBeTruthy()
    expect(screen.getByText('Applies to next game')).toBeTruthy()
    expect(screen.getByText('Draw')).toBeTruthy()
    expect(screen.getByText('Draw 1')).toBeTruthy()

    await fireEvent.press(screen.getByText('Draw'))
    await fireEvent.press(screen.getByText('Draw 3'))
    expect(mockSetSettings).toHaveBeenCalledWith({ klondikeDraw: 3 })
  })

  it.each(['/loadout/ginrummy', '/play/ginrummy'])("shows a two-player game's rules the same on its setup screen and in its match (%s)", async (path) => {
    mockPath = path
    await renderSections()

    expect(screen.getByText('GIN RUMMY')).toBeTruthy()
    // One row for them all (Jay, 2026-11-21), saying every choice in effect
    expect(screen.getByText('Rules')).toBeTruthy()
    expect(screen.getByText('To 100 · Knock at 10 · Gin 25, Under 25 · Melds and Count')).toBeTruthy()
    // No hint rows in a two-player game.
    expect(screen.queryByText('Auto Hint')).toBeNull()
  })

  it('opens every rule at once, and picking the choice already in effect writes nothing', async () => {
    mockPath = '/play/ginrummy'
    await renderSections()

    expect(screen.queryByText('Knocking')).toBeNull()
    await fireEvent.press(screen.getByText('Rules'))
    for (const label of ['Match', 'Knocking', 'Bonuses', 'Meld Help']) expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByText('Oklahoma')).toBeTruthy()
    await fireEvent.press(screen.getByText('Knock at 10'))
    expect(mockSetSettings).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByText('Oklahoma'))
    expect(mockSetSettings).toHaveBeenCalledWith({ ginKnock: 'oklahoma' })
  })

  it('has no section for a game without rules', async () => {
    mockPath = '/play/freecell'
    await renderSections()

    expect(screen.queryByText('Applies to next game')).toBeNull()
    expect(screen.getByText('Auto Hint')).toBeTruthy()
  })
})
