import { fireEvent, render, screen } from '@testing-library/react-native'

import { SettingsSections } from '@/components/SettingsSections'

// The Winnable Deals row (Jay, 2026-11-21: on by default), first in GAMEPLAY: what it does, or where it doesn't apply.

const mockSetSettings = jest.fn()
let mockPatch: Record<string, unknown> = {}

jest.mock('@/hooks/useSettings', () => {
  const { DEFAULT_SETTINGS } = jest.requireActual('@/redux/settingsSlice')
  return { useSettings: () => ({ settings: { ...DEFAULT_SETTINGS, ...mockPatch }, setSettings: mockSetSettings }) }
})
jest.mock('@/components/theme', () => {
  const actual = jest.requireActual('@/components/theme')
  return { ...actual, useTableColors: () => actual.lightColors }
})
jest.mock('@/components/cardFont', () => ({ CARD_FONT_FAMILY: 'TestSerif' }))
jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ profile: null }) }))
let mockPath = '/'
jest.mock('expo-router', () => ({ usePathname: () => mockPath }))

beforeEach(() => {
  mockSetSettings.mockClear()
  mockPatch = {}
  mockPath = '/'
})

describe('the Winnable Deals row', () => {
  it('leads the gameplay rows, and a tap turns it off while it is on (the default)', async () => {
    await render(<SettingsSections />)
    const labels = ['Winnable Deals', 'Auto-Move to Foundation', 'Dim Unplayable Cards', 'Auto Hint', 'Reduce Motion']
    const order = labels.map((label) => JSON.stringify(screen.toJSON()).indexOf(`"${label}"`))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(screen.getByText("Skip deals that can't be won")).toBeTruthy()

    await fireEvent.press(screen.getByText('Winnable Deals'))
    expect(mockSetSettings).toHaveBeenCalledWith({ winnableDeals: false })
  })

  it('turns back on from off', async () => {
    mockPatch = { winnableDeals: false }
    await render(<SettingsSections />)

    await fireEvent.press(screen.getByText('Winnable Deals'))
    expect(mockSetSettings).toHaveBeenCalledWith({ winnableDeals: true })
  })

  it('says so in a game whose rules have no winnable deals (2- and 4-suit Spider), on its setup screen and in play', async () => {
    mockPatch = { spiderSuits: 4 }
    mockPath = '/play/spider'
    await render(<SettingsSections />)
    expect(screen.getByText('Not for 4 Suits yet')).toBeTruthy()

    mockPatch = { spiderSuits: 2 }
    mockPath = '/loadout/spider'
    await render(<SettingsSections />)
    expect(screen.getByText('Not for 2 Suits yet')).toBeTruthy()
  })

  it('reads as usual in a game whose rules have them', async () => {
    for (const path of ['/play/spider', '/play/klondike', '/loadout/fortythieves', '/play/acesup']) {
      mockPath = path
      await render(<SettingsSections />)
      expect(screen.getByText("Skip deals that can't be won")).toBeTruthy()
    }
  })

  it("isn't in a two-player game's sheet, which deals no solitaire", async () => {
    mockPath = '/play/ginrummy'
    await render(<SettingsSections />)
    expect(screen.queryByText('Winnable Deals')).toBeNull()
  })
})
