import { type Action, configureStore, type Dispatch } from '@reduxjs/toolkit'
import { themeActions, themeReducer } from '@rific/auto-paper'
import { keepAwakeActions, keepAwakeReducer } from '@rific/core'
import { hapticActions, hapticReducer, soundActions, soundReducer } from '@rific/feedback-press'
import { type Profile, profilesActions, profilesReducer } from '@tastic/profile'
import { appSettingsActions, appSettingsReducer, profileSelectionActions, profileSelectionReducer } from '@tastic/shell'

import { GUEST_PLAYER_ID } from '@/constants/player'
import playerSettings, { type PlayerSettings, playerSettingsActions, playerSettingsMiddleware } from '@/redux/playerSettingsSlice'
import settings, { DEFAULT_SETTINGS, settingsActions } from '@/redux/settingsSlice'

const dad: Profile = { id: 'profile-dad', name: 'Dad', color: '#0000ff', tag: 'DAD', createdAt: 1, updatedAt: 1 }
const kid: Profile = { id: 'profile-kid', name: 'Kid', color: '#ff0000', tag: 'KID', createdAt: 2, updatedAt: 2 }

// Seat 1 of the shell's profileSelection is who's playing.
function makeStore(preloaded: { player?: string | null; profiles?: Profile[]; playerSettings?: Record<string, PlayerSettings> } = {}) {
  const store = configureStore({
    preloadedState: { profileSelection: { 1: preloaded.player ?? null, 2: null }, profiles: preloaded.profiles ?? [dad, kid], playerSettings: preloaded.playerSettings ?? {} },
    reducer: { profileSelection: profileSelectionReducer, profiles: profilesReducer, settings, appSettings: appSettingsReducer, sound: soundReducer, haptic: hapticReducer, keepAwake: keepAwakeReducer, theme: themeReducer, playerSettings },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(playerSettingsMiddleware)
  })
  // @tastic/profile's action creators type their actions without RTK's index signature.
  const dispatch = store.dispatch as Dispatch<Action>
  return Object.assign(store, { pick: (profileId: string | null) => dispatch(profileSelectionActions.select({ seat: 1, profileId })), send: dispatch })
}

describe('settings follow the player', () => {
  it('each player gets back every setting they left: rules, play aids, card looks, sound, haptics, Keep Awake, appearance, Blur, Reduce Motion', () => {
    const store = makeStore()
    store.pick(dad.id)
    store.dispatch(settingsActions.initialize({ klondikeDraw: 3, autoHintSeconds: 0, cardStyle: 'numeric', reduceMotion: true }))
    store.dispatch(soundActions.initialize({ enabled: false }))
    store.dispatch(hapticActions.initialize({ vibrate: false }))
    store.dispatch(keepAwakeActions.initialize({ enabled: false }))
    store.dispatch(themeActions.initialize({ appearance: 'dark', blur: false }))

    store.pick(kid.id)
    store.dispatch(settingsActions.initialize({ klondikeDraw: 1, autoHintSeconds: 15, cardStyle: 'decorated', reduceMotion: false }))
    store.dispatch(soundActions.initialize({ enabled: true }))
    store.dispatch(hapticActions.initialize({ vibrate: true }))
    store.dispatch(keepAwakeActions.initialize({ enabled: true }))
    store.dispatch(themeActions.initialize({ appearance: 'light', blur: true }))

    store.pick(dad.id)
    expect(store.getState().settings).toMatchObject({ klondikeDraw: 3, autoHintSeconds: 0, cardStyle: 'numeric', reduceMotion: true })
    expect(store.getState().sound.enabled).toBe(false)
    expect(store.getState().haptic.vibrate).toBe(false)
    expect(store.getState().keepAwake.enabled).toBe(false)
    expect(store.getState().theme).toMatchObject({ appearance: 'dark', blur: false })

    store.pick(kid.id)
    expect(store.getState().settings).toMatchObject({ klondikeDraw: 1, autoHintSeconds: 15, cardStyle: 'decorated', reduceMotion: false })
    expect(store.getState().sound.enabled).toBe(true)
    expect(store.getState().haptic.vibrate).toBe(true)
    expect(store.getState().keepAwake.enabled).toBe(true)
    expect(store.getState().theme).toMatchObject({ appearance: 'light', blur: true })
  })

  it("a lock comes back at the player's own angle, and an unlocked player doesn't inherit the last one's", () => {
    const store = makeStore()
    store.pick(kid.id)
    store.dispatch(appSettingsActions.initialize({ lockOrientation: true, lockedRotation: 90 }))

    store.pick(dad.id)
    store.dispatch(appSettingsActions.initialize({ lockOrientation: false, lockedRotation: undefined }))
    store.pick(kid.id)
    expect(store.getState().appSettings).toMatchObject({ lockOrientation: true, lockedRotation: 90 })

    store.pick(dad.id)
    expect(store.getState().appSettings.lockOrientation).toBe(false)
    expect(store.getState().appSettings.lockedRotation).toBeUndefined()
  })

  it('an unlocked player read back after a relaunch (no lockedRotation key at all) clears the last angle too', () => {
    // JSON drops an undefined key, so that is how an unlocked player's entry comes back from storage.
    const filed = JSON.parse(JSON.stringify({ settings: { ...DEFAULT_SETTINGS, lockOrientation: false, lockedRotation: undefined }, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'system', blur: true } })) as PlayerSettings
    const store = makeStore({ player: kid.id, playerSettings: { [dad.id]: filed } })
    store.dispatch(appSettingsActions.initialize({ lockOrientation: true, lockedRotation: 90 }))

    store.pick(dad.id)

    expect(store.getState().appSettings.lockOrientation).toBe(false)
    expect(store.getState().appSettings.lockedRotation).toBeUndefined()
  })

  it('a player with nothing filed starts with the settings on screen, so picking them changes nothing', () => {
    const store = makeStore()
    store.dispatch(settingsActions.initialize({ klondikeDraw: 3, dimUnplayable: false }))
    store.dispatch(soundActions.initialize({ enabled: false }))
    const before = store.getState()

    // New, made in a sibling app, or anyone from before settings followed the player.
    store.pick(kid.id)

    expect(store.getState().settings).toEqual(before.settings)
    expect(store.getState().sound).toEqual(before.sound)
    expect(store.getState().theme).toEqual(before.theme)
    // ...and from then on they are their own.
    store.dispatch(settingsActions.initialize({ klondikeDraw: 1 }))
    store.pick(null)
    expect(store.getState().settings.klondikeDraw).toBe(3)
  })

  it('a setting added after a player was filed keeps what is on screen', () => {
    const { autoHintSeconds: _added, ...older } = DEFAULT_SETTINGS
    const filed = { settings: older as typeof DEFAULT_SETTINGS, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'system' as const, blur: true } }
    const store = makeStore({ playerSettings: { [kid.id]: filed } })
    store.dispatch(settingsActions.initialize({ autoHintSeconds: 30 }))

    store.pick(kid.id)

    expect(store.getState().settings.autoHintSeconds).toBe(30)
  })

  it('files Guest like any player', () => {
    const store = makeStore()
    store.dispatch(settingsActions.initialize({ spiderSuits: 4 }))
    store.pick(dad.id)
    store.dispatch(settingsActions.initialize({ spiderSuits: 1 }))

    store.pick(null)

    expect(store.getState().playerSettings[GUEST_PLAYER_ID]?.settings.spiderSuits).toBe(4)
    expect(store.getState().settings.spiderSuits).toBe(4)
  })

  it('does not file a player who was just deleted', () => {
    const store = makeStore({ player: kid.id, profiles: [dad] })
    store.send(playerSettingsActions.remove(kid.id))

    store.pick(null)

    expect(store.getState().playerSettings[kid.id]).toBeUndefined()
  })
})

// Seat 1 changes hands three ways, and the middleware follows all of them: a pick (above), the shell's deleteProfile
// (remove, then clearProfile), and a profile a sibling app deleted (setAll, then pruneToRoster).
describe('every way seat 1 changes hands', () => {
  function kidPlayingWithGuestFiled() {
    const store = makeStore()
    store.dispatch(settingsActions.initialize({ klondikeDraw: 3 }))
    store.pick(kid.id)
    store.dispatch(settingsActions.initialize({ klondikeDraw: 1, autoHintSeconds: 30 }))
    return store
  }

  it("a delete on the Profiles screen (the shell's clearProfile) gives Guest their settings back and files nothing for Kid", () => {
    const store = kidPlayingWithGuestFiled()

    store.send(profilesActions.remove(kid.id))
    store.send(profileSelectionActions.clearProfile(kid.id))

    expect(store.getState().profileSelection[1]).toBeNull()
    expect(store.getState().settings.klondikeDraw).toBe(3)
    expect(store.getState().playerSettings[kid.id]).toBeUndefined()
  })

  it("a profile a sibling app deleted (the shell's pruneToRoster) gives Guest their settings back and files nothing for it", () => {
    const store = kidPlayingWithGuestFiled()

    store.send(profilesActions.setAll([dad]))
    store.send(profileSelectionActions.pruneToRoster([dad.id]))

    expect(store.getState().profileSelection[1]).toBeNull()
    expect(store.getState().settings.klondikeDraw).toBe(3)
    expect(store.getState().playerSettings[kid.id]).toBeUndefined()
  })

  it('a rehydrate that puts the last player back is not a change of player', () => {
    const filed: PlayerSettings = { settings: { ...DEFAULT_SETTINGS, klondikeDraw: 3 }, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'system', blur: true } }
    const store = makeStore({ playerSettings: { [kid.id]: filed } })

    store.send({ type: 'persist/REHYDRATE', key: 'root', payload: { profileSelection: { 1: kid.id, 2: null } } } as Action)

    expect(store.getState().profileSelection[1]).toBe(kid.id)
    expect(store.getState().settings.klondikeDraw).toBe(DEFAULT_SETTINGS.klondikeDraw)
    expect(store.getState().playerSettings[GUEST_PLAYER_ID]).toBeUndefined()
  })
})

// Lock Orientation moved from `settings` to the shell's `appSettings` in the CardTastic move, and is still filed with a
// player's settings, as before.
describe('the lock, filed with the settings', () => {
  it("files the live lock (appSettings) with the player's settings", () => {
    const store = makeStore()
    store.pick(kid.id)
    store.dispatch(appSettingsActions.initialize({ lockOrientation: true, lockedRotation: -90 }))

    store.pick(dad.id)

    expect(store.getState().playerSettings[kid.id]?.settings).toMatchObject({ lockOrientation: true, lockedRotation: -90 })
  })

  it("loads a lock 1.2.8 filed in a player's settings into appSettings, and leaves a 1.2.8 lock in `settings` as it was", () => {
    // As 1.2.8 filed it: the lock inside the settings.
    const filed = JSON.parse(JSON.stringify({ settings: { ...DEFAULT_SETTINGS, lockOrientation: true, lockedRotation: 180 }, sound: { enabled: true }, haptic: { vibrate: true }, keepAwake: { enabled: true }, theme: { appearance: 'system', blur: true } })) as PlayerSettings
    const store = makeStore({ playerSettings: { [kid.id]: filed } })
    // The lock a 1.2.8 store left in `settings`, kept for a rollback.
    store.send({ type: 'persist/REHYDRATE', key: 'root', payload: { settings: { ...DEFAULT_SETTINGS, lockOrientation: false } } } as Action)

    store.pick(kid.id)

    expect(store.getState().appSettings).toMatchObject({ lockOrientation: true, lockedRotation: 180 })
    expect(store.getState().settings).toMatchObject({ lockOrientation: false })
    expect(store.getState().settings).not.toHaveProperty('lockedRotation')
  })
})
