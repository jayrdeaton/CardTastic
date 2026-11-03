import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { cancelAnimation, withRepeat } from 'react-native-reanimated'

import { HeroCards } from '@/components/HeroCards'
import { HERO_FAN_CARDS, HERO_FAN_HEIGHT, HERO_FAN_SPAN } from '@/components/heroFan'

// The real HeroCards over the repo's Reanimated stand-in, with withRepeat counted. What is under test is that the
// fan's forever-running wave is ONE clock: the old fan started a separate repeating sequence per card, and those
// drifted apart frame by frame until the left-to-right ripple was scrambled (see heroFan.ts's heroBumpAt).
jest.mock('react-native-reanimated', () => {
  const stand = jest.requireActual('../../__mocks__/react-native-reanimated')
  return { ...stand, withRepeat: jest.fn(stand.withRepeat) }
})
jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ profile: null }) }))
jest.mock('@/hooks/useSettings', () => {
  const actual = jest.requireActual('@/redux/settingsSlice')
  const value = { settings: { ...actual.DEFAULT_SETTINGS } }
  return { useSettings: () => value }
})
jest.mock('@/components/theme', () => {
  const actual = jest.requireActual('@/components/theme')
  return { ...actual, useTableColors: () => actual.lightColors }
})
// The card art is irrelevant here (and heavy).
jest.mock('@tastic/cards', () => {
  const { View: MockView } = require('react-native')
  return { CardBack: () => <MockView testID='hero-card-back' />, DecoratedCardBack: () => <MockView testID='hero-card-back' /> }
})

beforeEach(() => {
  jest.mocked(withRepeat).mockClear()
  jest.mocked(cancelAnimation).mockClear()
})

describe('HeroCards', () => {
  it('drives all five cards from one wave clock', async () => {
    await render(<HeroCards />)
    expect(screen.getAllByTestId('hero-card-back')).toHaveLength(HERO_FAN_CARDS.length)
    expect(withRepeat).toHaveBeenCalledTimes(1)
  })

  // `active` is @tastic/shell's Home's own: focused, with the app in the foreground.
  it('stops the clock while Home is covered or in the background, and restarts that one clock (not one per card) on return', async () => {
    const { rerender } = await render(<HeroCards active />)
    await rerender(<HeroCards active={false} />)
    expect(cancelAnimation).toHaveBeenCalledTimes(1)
    expect(withRepeat).toHaveBeenCalledTimes(1)
    await rerender(<HeroCards active />)
    expect(withRepeat).toHaveBeenCalledTimes(2)
  })

  it.each([1, 0.8])("lays its row out as the fan's resting box (scale %p)", async (scale) => {
    await render(<HeroCards scale={scale} />)
    // the row is the component's root view
    const row = screen.toJSON() as { props: { style?: unknown } }
    expect(StyleSheet.flatten(row.props.style as never)).toMatchObject({ width: HERO_FAN_SPAN * scale, height: HERO_FAN_HEIGHT * scale })
  })
})
