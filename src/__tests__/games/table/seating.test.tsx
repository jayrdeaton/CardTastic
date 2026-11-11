import { renderHook } from '@testing-library/react-native'

import { isAtComputer, realTimeSeatTwo } from '@/games/table/realTimeSeats'
import { useFaceToFace } from '@/games/table/TableChrome'
import { games } from '@/pack'

// Where 2 Player's two people sit (Jay, 2026-11-07: face to face only on a phone or tablet, natively or in its browser): at a computer
// (the shell's useAtComputer, a stand-in here) side by side, in the setup screen (every two-player game's sideBySideAtComputer) and at
// the table, where player 2's side is drawn upright and the result cards sit side by side (useFaceToFace).
let mockAtComputer = false
jest.mock('@tastic/shell', () => ({ ...jest.requireActual('@tastic/shell'), useAtComputer: () => mockAtComputer }))

afterEach(() => {
  mockAtComputer = false
})

describe('useFaceToFace', () => {
  it('turns player 2 to face them in 2 Player on a phone or tablet', async () => {
    expect((await renderHook(() => useFaceToFace(true))).result.current).toBe(true)
  })

  it('keeps player 2 upright at a computer', async () => {
    mockAtComputer = true
    expect((await renderHook(() => useFaceToFace(true))).result.current).toBe(false)
  })

  it('never turns anything against the CPU', async () => {
    expect((await renderHook(() => useFaceToFace(false))).result.current).toBe(false)
    mockAtComputer = true
    expect((await renderHook(() => useFaceToFace(false))).result.current).toBe(false)
  })
})

const REAL_TIME = ['ratslap', 'slapjack', 'speed']

describe("the setup screen's seating", () => {
  it('offers Player in every two-player game on a phone or tablet', () => {
    const twoPlayer = games.filter((game) => game.seatTwo?.includes('person'))
    expect(twoPlayer.map((game) => game.id)).toEqual([...REAL_TIME, 'war', 'sixcardgolf', 'trash', 'ginrummy', 'fourcrowns', 'crazyeights'])
  })

  it('sits side by side at a computer in every game that offers Player there', () => {
    for (const game of games.filter((g) => g.seatTwo?.includes('person') && !REAL_TIME.includes(g.id))) expect(game.sideBySideAtComputer).toBe(true)
  })
})

// RatSlap, Slapjack and Speed are played in real time, and a computer has one mouse, so two people can't both slap or play
// at once there: seat 2 is only the CPU (Jay, 2026-11-11). Turn-based and pass-and-play games keep Player.
describe('the real-time games at a computer', () => {
  it('offer only the CPU at a computer, and the CPU or a person elsewhere', () => {
    expect(realTimeSeatTwo(true)).toEqual(['cpu'])
    expect(realTimeSeatTwo(false)).toEqual(['cpu', 'person'])
  })

  it('read the choice each time, so the setup screen follows the device it runs on', () => {
    for (const id of REAL_TIME) {
      const game = games.find((g) => g.id === id)
      const getter = game && Object.getOwnPropertyDescriptor(game, 'seatTwo')?.get
      expect(getter).toBeDefined()
    }
  })

  it('treat the web without a touch-first screen as a computer, and never a phone or tablet app', () => {
    const { Platform } = jest.requireActual<typeof import('react-native')>('react-native')
    const os = Platform.OS
    const matchMedia = window.matchMedia
    const touchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    const setTouch = (points: number, fine: boolean, coarse: boolean) => {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: points })
      window.matchMedia = ((query: string) => ({ matches: query === '(pointer: fine)' ? fine : query === '(pointer: coarse)' ? coarse : false })) as typeof window.matchMedia
    }
    try {
      Platform.OS = 'ios'
      setTouch(0, true, false)
      expect(isAtComputer()).toBe(false)
      Platform.OS = 'web'
      expect(isAtComputer()).toBe(true)
      setTouch(5, true, false)
      expect(isAtComputer()).toBe(true)
      setTouch(5, false, true)
      expect(isAtComputer()).toBe(false)
      setTouch(0, false, true)
      expect(isAtComputer()).toBe(false)
    } finally {
      Platform.OS = os
      window.matchMedia = matchMedia
      if (touchPoints) Object.defineProperty(navigator, 'maxTouchPoints', touchPoints)
      else delete (navigator as { maxTouchPoints?: number }).maxTouchPoints
    }
  })
})
