import { renderHook } from '@testing-library/react-native'

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

describe("the setup screen's seating", () => {
  it('sits side by side at a computer in every two-player game', () => {
    const twoPlayer = games.filter((game) => game.seatTwo?.includes('person'))
    expect(twoPlayer.map((game) => game.id)).toEqual(['ratslap', 'slapjack', 'speed', 'war', 'sixcardgolf', 'trash', 'ginrummy', 'fourcrowns', 'crazyeights'])
    for (const game of twoPlayer) expect(game.sideBySideAtComputer).toBe(true)
  })
})
