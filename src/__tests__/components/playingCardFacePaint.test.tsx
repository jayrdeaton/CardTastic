import { CardSizeProvider } from '@tastic/cards'
import { act, fireEvent, render, screen } from '@testing-library/react-native'

import { FaceLoadTrackingContext, isAnyFaceLoading } from '@/components/cardFacePaint'
import { PlayingCard } from '@/components/PlayingCard'
import type { Card } from '@/engine/types'

// A card face is one <Image> whose bitmap React Native delivers a frame or two after the view appears (cardFacePaint.ts).
// The face reports itself as loading until its onLoad, and a card turned face-up in place keeps its back drawn over the
// new face until then. "Loaded" here is firing the face Image's load event.

jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ profile: null, color: '#e91e63' }) }))
jest.mock('@/hooks/useSettings', () => {
  const actual = jest.requireActual('@/redux/settingsSlice')
  const value = { settings: { ...actual.DEFAULT_SETTINGS } }
  return { useSettings: () => value }
})
jest.mock('@tastic/cards', () => {
  const { View } = require('react-native')
  const actual = jest.requireActual('@tastic/cards')
  return { ...actual, CardFace: () => <View />, CardBack: () => <View testID='card-back' />, DecoratedCardBack: () => <View testID='card-back' /> }
})

const NINE = (faceUp: boolean, deck = 0): Card => ({ id: `spades-9-${deck}`, suit: 'spades', rank: 9, faceUp }) as Card

function playing(card: Card, tracking = true) {
  return (
    <CardSizeProvider width={64}>
      <FaceLoadTrackingContext.Provider value={tracking}>
        <PlayingCard card={card} />
      </FaceLoadTrackingContext.Provider>
    </CardSizeProvider>
  )
}
const face = () => screen.getByLabelText('9 of spades')
const loadFace = async () => {
  await act(async () => {
    fireEvent(face(), 'load', { nativeEvent: {} })
  })
}

describe('PlayingCard face paint', () => {
  it('reports its face as loading from the commit it mounts until its onLoad', async () => {
    const r = await render(playing(NINE(true)))
    expect(isAnyFaceLoading(['spades-9-0'])).toBe(true)
    await loadFace()
    expect(isAnyFaceLoading(['spades-9-0'])).toBe(false)
    await r.unmount()
  })

  it('stops reporting when it unmounts before loading', async () => {
    const r = await render(playing(NINE(true)))
    await r.unmount()
    expect(isAnyFaceLoading(['spades-9-0'])).toBe(false)
  })

  it('does not report a bitmap it has already painted (a twin card in a two-deck game shows the same one) - no new load would ever close it', async () => {
    const r = await render(playing(NINE(true, 0)))
    await loadFace()
    await r.rerender(playing(NINE(true, 1)))
    expect(isAnyFaceLoading(['spades-9-1'])).toBe(false)
    await r.unmount()
  })

  it('a ghost does not report its face (its faces are not the board)', async () => {
    const r = await render(playing(NINE(true), false))
    expect(isAnyFaceLoading(['spades-9-0'])).toBe(false)
    await r.unmount()
  })
})

describe('PlayingCard turned face-up in place', () => {
  it('keeps its back drawn over the new face until that face has loaded, then shows the face', async () => {
    const r = await render(playing(NINE(false)))
    expect(screen.queryAllByTestId('card-back')).toHaveLength(1)
    await r.rerender(playing(NINE(true)))
    expect(face()).toBeTruthy() // the face is mounted (and loading) ...
    expect(screen.queryAllByTestId('card-back')).toHaveLength(1) // ... under the back, which still shows
    await loadFace()
    expect(screen.queryAllByTestId('card-back')).toHaveLength(0)
    await r.unmount()
  })

  it('shows the face anyway if it never reports', async () => {
    jest.useFakeTimers()
    try {
      const r = await render(playing(NINE(false)))
      await r.rerender(playing(NINE(true)))
      await act(async () => {
        await jest.advanceTimersByTimeAsync(250)
      })
      expect(screen.queryAllByTestId('card-back')).toHaveLength(0)
      await r.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('a card that is face-up from the start never draws a back', async () => {
    const r = await render(playing(NINE(true)))
    expect(screen.queryAllByTestId('card-back')).toHaveLength(0)
    await r.unmount()
  })
})

// Android draws images with Fresco, which gives a view a bitmap already in its memory cache in the frame the view mounts,
// so a face whose bitmap has loaded once on this run counts as painted in the commit that mounts it (cardFacePaint.ts's
// isFaceDecoded): a ghost no longer waits a JS round trip for an onLoad before it can fly.
describe('PlayingCard face paint on Android', () => {
  const { Platform } = require('react-native')
  const { forgetDecodedFaces } = require('@/components/cardFacePaint')
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android')
    forgetDecodedFaces()
  })
  afterEach(() => {
    jest.restoreAllMocks()
    forgetDecodedFaces()
  })

  function ghost(card: Card, onFacePainted: () => void, width = 64) {
    return (
      <CardSizeProvider width={width}>
        <FaceLoadTrackingContext.Provider value={false}>
          <PlayingCard card={card} onFacePainted={onFacePainted} />
        </FaceLoadTrackingContext.Provider>
      </CardSizeProvider>
    )
  }
  const loadFaces = async () => {
    await act(async () => {
      screen.getAllByLabelText('9 of spades').forEach((img) => fireEvent(img, 'load', { nativeEvent: {} }))
    })
  }

  it('waits for the onLoad of a bitmap it has not loaded yet', async () => {
    const painted = jest.fn()
    const r = await render(ghost(NINE(true), painted))
    expect(painted).not.toHaveBeenCalled()
    await loadFaces()
    expect(painted).toHaveBeenCalled()
    await r.unmount()
  })

  it('counts a face whose bitmap has loaded before as painted in the commit that mounts it, and never as loading', async () => {
    const board = await render(playing(NINE(true)))
    await loadFaces()
    const painted = jest.fn()
    const flight = await render(ghost(NINE(true), painted))
    expect(painted).toHaveBeenCalledTimes(1)
    await flight.unmount()
    await board.unmount()
    const again = await render(playing(NINE(true, 1)))
    expect(isAnyFaceLoading(['spades-9-1'])).toBe(false)
    await again.unmount()
  })

  it('turns a card face-up in place at once when its bitmap has loaded before', async () => {
    const first = await render(playing(NINE(true)))
    await loadFaces()
    await first.unmount()
    const r = await render(playing(NINE(false)))
    await r.rerender(playing(NINE(true)))
    expect(screen.queryAllByTestId('card-back')).toHaveLength(0)
    await r.unmount()
  })

  it('waits again at another size (an OTA image is decoded at the size it is drawn)', async () => {
    const first = await render(ghost(NINE(true), jest.fn(), 64))
    await loadFaces()
    await first.unmount()
    const painted = jest.fn()
    const r = await render(ghost(NINE(true), painted, 80))
    expect(painted).not.toHaveBeenCalled()
    await r.unmount()
  })

  it('starts over when the face set changes (another card style)', async () => {
    const { noteFaceDecoded, isFaceDecoded } = require('@/components/cardFacePaint')
    noteFaceDecoded('compact/normal', 1, '64x90')
    expect(isFaceDecoded('compact/normal', 1, '64x90')).toBe(true)
    noteFaceDecoded('tarot/normal', 2, '64x90')
    expect(isFaceDecoded('compact/normal', 1, '64x90')).toBe(false)
    expect(isFaceDecoded('tarot/normal', 1, '64x90')).toBe(false)
    expect(isFaceDecoded('tarot/normal', 2, '64x90')).toBe(true)
  })

  it('still waits for every onLoad on iOS, where a cached image is filled in off the main thread too', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    const first = await render(ghost(NINE(true), jest.fn()))
    await loadFaces()
    await first.unmount()
    const painted = jest.fn()
    const r = await render(ghost(NINE(true), painted))
    expect(painted).not.toHaveBeenCalled()
    await r.unmount()
  })
})
