import { renderHook } from '@testing-library/react-native'
import * as ScreenOrientation from 'expo-screen-orientation'
import { Dimensions } from 'react-native'

import { usePortraitOnPhones } from '@/components/portraitOnPhones'

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { PORTRAIT_UP: 3 },
  lockAsync: jest.fn(() => Promise.resolve()),
  unlockAsync: jest.fn(() => Promise.resolve())
}))

const lockAsync = jest.mocked(ScreenOrientation.lockAsync)
const unlockAsync = jest.mocked(ScreenOrientation.unlockAsync)

function screen(width: number, height: number) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 3, fontScale: 1 })
}

afterEach(() => {
  jest.restoreAllMocks()
  lockAsync.mockClear()
  unlockAsync.mockClear()
})

// The two-player tables hold a phone upright; tablets follow the OS (src/components/portraitOnPhones.ts).
describe('usePortraitOnPhones', () => {
  it('holds a phone upright while a screen needs it, and lets go once the last one leaves', async () => {
    screen(402, 874)
    const setup = await renderHook(() => usePortraitOnPhones())
    // The play screen pushed over the setup screen, which stays mounted under it.
    const play = await renderHook(() => usePortraitOnPhones())
    expect(lockAsync).toHaveBeenCalledTimes(1)
    expect(lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP)

    await play.unmount()
    expect(unlockAsync).not.toHaveBeenCalled()
    await setup.unmount()
    expect(unlockAsync).toHaveBeenCalledTimes(1)
  })

  it('reads a phone held sideways as a phone', async () => {
    screen(874, 402)
    await (await renderHook(() => usePortraitOnPhones())).unmount()
    expect(lockAsync).toHaveBeenCalledTimes(1)
    expect(unlockAsync).toHaveBeenCalledTimes(1)
  })

  it('leaves a tablet to follow the OS', async () => {
    screen(1032, 1376)
    await (await renderHook(() => usePortraitOnPhones())).unmount()
    expect(lockAsync).not.toHaveBeenCalled()
    expect(unlockAsync).not.toHaveBeenCalled()
  })

  it('does nothing for a screen that follows the OS (a solitaire game)', async () => {
    screen(402, 874)
    await (await renderHook(() => usePortraitOnPhones(false))).unmount()
    expect(lockAsync).not.toHaveBeenCalled()
    expect(unlockAsync).not.toHaveBeenCalled()
  })
})
