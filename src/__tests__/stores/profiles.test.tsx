import { configureStore } from '@reduxjs/toolkit'
import { type Profile, profilesReducer, resolveInitialProfiles, useSharedProfilesSync, type UseSharedProfilesSyncOptions } from '@tastic/profile'
import { createSeatColorsReducer, profileSelectionReducer, ProfilesProvider, type SeatColorsState } from '@tastic/shell'
import { act, renderHook } from '@testing-library/react-native'
import { ReactNode } from 'react'
import { Provider } from 'react-redux'

import { SEAT_COLORS } from '@/constants/player'
import { DEFAULT_SEED_COLOR } from '@/constants/theme'
import { usePlayer, useProfiles } from '@/stores/profiles'

// Who's playing is seat 1 of @tastic/shell's profileSelection, and their color pick is the shell's seatColors
// (@tastic/profile's createSeatColorsSlice, which began as Solitaire's tableColor). usePlayer reads them; the roster's
// reconcile and its self-heal (pruneToRoster) are the shell's ProfilesProvider's, tested in the package.

jest.mock('@tastic/profile', () => ({
  ...jest.requireActual('@tastic/profile'),
  resolveInitialProfiles: jest.fn(),
  useSharedProfilesSync: jest.fn()
}))

const GUEST = '#00ff00'
const PICK = '#abcdef'
const red: Profile = { id: 'red', name: 'Red', color: '#ff0000', tag: 'RED', createdAt: 1, updatedAt: 1 }
const blue: Profile = { id: 'blue', name: 'Blue', color: '#0000ff', tag: 'BLU', createdAt: 2, updatedAt: 2 }

const colorsWith = (patch: Partial<SeatColorsState> = {}): SeatColorsState => ({ lastGuestColor: { 1: GUEST, 2: SEAT_COLORS[2] }, lastCpuColor: SEAT_COLORS[2], profileColors: {}, ...patch })

// A store holding just the slices the provider and usePlayer read, seeded the way a rehydrated store would be.
async function setup({ local, active, resolved, colors = colorsWith() }: { local: Profile[]; active: string | null; resolved: Profile[]; colors?: SeatColorsState }) {
  const store = configureStore({
    preloadedState: { profileSelection: { 1: active, 2: null }, profiles: local, seatColors: colors },
    reducer: { profileSelection: profileSelectionReducer, profiles: profilesReducer, seatColors: createSeatColorsReducer(SEAT_COLORS) }
  })
  jest.mocked(resolveInitialProfiles).mockResolvedValue(resolved)
  const remote: { onRemoteChange: UseSharedProfilesSyncOptions['onRemoteChange'] } = { onRemoteChange: () => undefined }
  jest.mocked(useSharedProfilesSync).mockImplementation(({ onRemoteChange }) => {
    remote.onRemoteChange = onRemoteChange
    return { syncToShared: jest.fn() }
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <ProfilesProvider>{children}</ProfilesProvider>
    </Provider>
  )
  let renders = 0
  const view = await renderHook(
    () => {
      renders++
      return { player: usePlayer(), roster: useProfiles() }
    },
    { wrapper }
  )
  // Lets resolveInitialProfiles settle.
  await act(async () => {})
  return { store, remote, renders: () => renders, ...view }
}

describe('usePlayer over the shell', () => {
  it("drops a player the resolved roster no longer has (the shell's self-heal), and puts the felt back on guest", async () => {
    const { store, result } = await setup({ local: [red], active: 'red', resolved: [blue] })

    expect(store.getState().profileSelection[1]).toBeNull()
    expect(result.current.player).toMatchObject({ profileId: null, profile: null, color: GUEST })
  })

  it('drops the player when a sibling app deleted them while this one was backgrounded', async () => {
    const { store, remote, result } = await setup({ local: [red, blue], active: 'red', resolved: [red, blue] })

    await act(async () => remote.onRemoteChange([blue]))

    expect(store.getState().profileSelection[1]).toBeNull()
    expect(result.current.player).toMatchObject({ profileId: null, profile: null, color: GUEST })
  })

  // The shell replaces the whole roster on every foreground resume, with new objects. Every card reads the player, so
  // the same profiles mustn't re-render them.
  it('re-renders nothing for a roster replaced with the same profiles', async () => {
    const { remote, result, renders } = await setup({ local: [red, blue], active: 'red', resolved: [red, blue] })
    const before = result.current.player
    const count = renders()

    await act(async () => remote.onRemoteChange(JSON.parse(JSON.stringify([red, blue])) as Profile[]))

    expect(result.current.player).toBe(before)
    // The roster's own consumers (Home's button, Profiles) do re-render: only usePlayer is held.
    expect(renders()).toBe(count + 1)
  })

  it("starts a guest who never picked a color on seat 1's default, DEFAULT_SEED_COLOR", async () => {
    const { result } = await setup({ local: [red], active: null, resolved: [red], colors: colorsWith({ lastGuestColor: { ...SEAT_COLORS } }) })

    expect(result.current.player.color).toBe(DEFAULT_SEED_COLOR)
  })
})

// Each player's color pick in Solitaire is kept across relaunches (Jay, 2026-10-16); it used to last only until
// the next launch or profile switch for a profile.
describe('usePlayer color picks', () => {
  it("shows a profile's pick from an earlier launch", async () => {
    const { result } = await setup({ local: [red, blue], active: 'red', resolved: [red, blue], colors: colorsWith({ profileColors: { red: { color: PICK, profileColor: red.color } } }) })

    expect(result.current.player.color).toBe(PICK)
  })

  it("saves a pick under the selected profile and shows each player's own on a switch", async () => {
    const { store, result } = await setup({ local: [red, blue], active: 'red', resolved: [red, blue] })

    await act(async () => result.current.player.setColor(PICK))
    expect(store.getState().seatColors.profileColors).toEqual({ red: { color: PICK, profileColor: red.color } })
    expect(result.current.player.color).toBe(PICK)

    await act(async () => result.current.player.select('blue'))
    expect(result.current.player.color).toBe(blue.color)
    await act(async () => result.current.player.select(null))
    expect(result.current.player.color).toBe(GUEST)
    await act(async () => result.current.player.select('red'))
    expect(result.current.player.color).toBe(PICK)
  })

  it("drops a profile's pick when the profile's own color is picked, in any case", async () => {
    const { store, result } = await setup({ local: [red], active: 'red', resolved: [red], colors: colorsWith({ profileColors: { red: { color: PICK, profileColor: red.color } } }) })

    await act(async () => result.current.player.setColor(red.color.toUpperCase()))

    expect(store.getState().seatColors.profileColors).toEqual({})
    expect(result.current.player.color).toBe(red.color)
  })

  it("saves guest's pick as seat 1's guest color", async () => {
    const { store, result } = await setup({ local: [red], active: null, resolved: [red] })

    await act(async () => result.current.player.setColor(PICK))

    expect(store.getState().seatColors.lastGuestColor[1]).toBe(PICK)
    expect(result.current.player.color).toBe(PICK)
  })

  it('lets a new color for the profile itself replace its pick, but keeps the pick through a rename', async () => {
    const { store, result } = await setup({ local: [red], active: 'red', resolved: [red], colors: colorsWith({ profileColors: { red: { color: PICK, profileColor: red.color } } }) })

    await act(async () => result.current.roster.updateProfile('red', { name: 'Ruby', color: red.color, tag: red.tag }))
    expect(store.getState().seatColors.profileColors).toEqual({ red: { color: PICK, profileColor: red.color } })

    await act(async () => result.current.roster.updateProfile('red', { name: 'Ruby', color: '#ff8800', tag: red.tag }))
    expect(store.getState().seatColors.profileColors).toEqual({})
    expect(result.current.player.color).toBe('#ff8800')
  })

  // New with the shell: a sibling app's new color for the profile replaces the pick too (it used to be kept).
  it("lets a sibling app's new color for the profile replace its pick", async () => {
    const { result, remote } = await setup({ local: [red], active: 'red', resolved: [red], colors: colorsWith({ profileColors: { red: { color: PICK, profileColor: red.color } } }) })

    await act(async () => remote.onRemoteChange([{ ...red, color: '#ff8800' }]))

    expect(result.current.player.color).toBe('#ff8800')
  })
})
