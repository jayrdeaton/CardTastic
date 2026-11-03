import { fireEvent, render, screen } from '@testing-library/react-native'

import { SettingsSections } from '@/components/SettingsSections'

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

beforeEach(() => {
  mockSetSettings.mockClear()
  mockAutoHintSeconds = 0
})

async function renderSections() {
  await render(<SettingsSections />)
}

describe("Solitaire's own Settings sections", () => {
  it('labels the gameplay rows and the card rows', async () => {
    await renderSections()

    expect(screen.getByText('GAMEPLAY')).toBeTruthy()
    expect(screen.getByText('CARDS')).toBeTruthy()
  })

  it("shows Auto Hint's choice as the row's caption, and steps to the next one on a tap", async () => {
    await renderSections()
    expect(screen.getByText('Off')).toBeTruthy()

    await fireEvent.press(screen.getByText('Auto Hint'))
    expect(mockSetSettings).toHaveBeenCalledWith({ autoHintSeconds: 15 })
  })

  it('spells the wait out in the caption', async () => {
    mockAutoHintSeconds = 30
    await renderSections()

    expect(screen.getByText('After 30 seconds')).toBeTruthy()
  })
})
