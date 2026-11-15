import { router } from 'expo-router'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { useState } from 'react'
import { BackHandler, Pressable, Text, View } from 'react-native'
import { Provider as PaperProvider } from 'react-native-paper'

import { QuitMatchDialog, useQuitMatch } from '@/games/table/QuitMatch'
import { TableSideButtons } from '@/games/table/TableChrome'

// Quit Match? under expo-router's real in-memory router, not the app-wide stand-in (src/__mocks__/expo-router.ts), since the
// block is expo-router's usePreventRemove: the shell's own test found a stubbed one passing while Quit did nothing in the app.
jest.unmock('expo-router')

// Android's back as the router's container hears it: React Native's BackHandler is a no-op off Android, so this keeps every
// listener and calls them the way the OS does (the newest first, until one handles it).
type BackListener = Parameters<typeof BackHandler.addEventListener>[1]
const backListeners: BackListener[] = []
jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
  backListeners.push(handler)
  return { remove: () => backListeners.splice(backListeners.indexOf(handler), 1) }
})
async function pressAndroidBack() {
  await act(async () => {
    for (const handler of [...backListeners].reverse()) if (handler({} as Parameters<BackListener>[0])) return
  })
}

// A table in miniature: a match whose state moves on with each play, ends, and deals again, with the real side buttons
// (Home through tableHome) and the real dialog.
function Table() {
  const [state, setState] = useState(() => ({ plays: 0 }))
  const [over, setOver] = useState(false)
  const quit = useQuitMatch()
  return (
    <PaperProvider>
      <View>
        <Text>{quit.asking ? 'Held' : 'Playing'}</Text>
        <Pressable accessibilityLabel='Play' onPress={() => setState((current) => ({ plays: current.plays + 1 }))} />
        <Pressable accessibilityLabel='Win' onPress={() => setOver(true)} />
        <Pressable
          accessibilityLabel='Rematch'
          onPress={() => {
            setState({ plays: 0 })
            setOver(false)
          }}
        />
        <TableSideButtons y={200} onSettings={() => {}} />
        <QuitMatchDialog quit={quit} state={state} over={over} />
      </View>
    </PaperProvider>
  )
}

const ROUTES = {
  index: () => <Text>Home screen</Text>,
  'loadout/[game]': () => <Text>Setup screen</Text>,
  'play/[game]': Table
}

async function openMatch() {
  const rendered = await renderRouter(ROUTES, { initialUrl: '/' })
  await act(async () => router.push('/loadout/ginrummy'))
  await act(async () => router.push('/play/ginrummy'))
  expect(rendered.getPathname()).toBe('/play/ginrummy')
  return rendered
}

async function play() {
  await fireEvent.press(screen.getByLabelText('Play'))
}

let warn: jest.SpyInstance
let error: jest.SpyInstance
beforeEach(() => {
  backListeners.length = 0
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  error = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  // expo-router warns when a stopped navigation is carried on with the block still on.
  expect(warn).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
  warn.mockRestore()
  error.mockRestore()
})

describe('Quit Match? on a table', () => {
  it('leaves a fresh deal at once: Home goes Home, nothing to lose yet', async () => {
    const rendered = await openMatch()
    await fireEvent.press(screen.getByLabelText('Home'))
    expect(screen.queryByText('Quit Match?')).toBeNull()
    expect(rendered.getPathname()).toBe('/')
  })

  it('asks from the Home button once a card is played, holds the table, and goes Home on Quit', async () => {
    const rendered = await openMatch()
    await play()
    await fireEvent.press(screen.getByLabelText('Home'))
    expect(screen.getByText('Quit Match?')).toBeTruthy()
    expect(screen.getByText("This match won't be saved.")).toBeTruthy()
    expect(screen.getByText('Held')).toBeTruthy()
    expect(rendered.getPathname()).toBe('/play/ginrummy')

    await fireEvent.press(screen.getByText('Quit'))
    expect(rendered.getPathname()).toBe('/')
    expect(screen.getByText('Home screen')).toBeTruthy()
  })

  it("asks on Android's back, and Quit goes back to the setup screen", async () => {
    const rendered = await openMatch()
    await play()
    await pressAndroidBack()
    expect(screen.getByText('Quit Match?')).toBeTruthy()
    expect(rendered.getPathname()).toBe('/play/ginrummy')

    await fireEvent.press(screen.getByText('Quit'))
    expect(rendered.getPathname()).toBe('/loadout/ginrummy')
  })

  it("asks on the router's back (the browser's back goes through it); Cancel plays on and asks again next time", async () => {
    const rendered = await openMatch()
    await play()
    await act(async () => router.back())
    expect(screen.getByText('Quit Match?')).toBeTruthy()

    await fireEvent.press(screen.getByText('Cancel'))
    expect(screen.queryByText('Quit Match?')).toBeNull()
    expect(screen.getByText('Playing')).toBeTruthy()
    await act(async () => router.back())
    expect(screen.getByText('Quit Match?')).toBeTruthy()
    expect(rendered.getPathname()).toBe('/play/ginrummy')
  })

  it("closes on Android's back while it's up, staying in the match", async () => {
    const rendered = await openMatch()
    await play()
    await fireEvent.press(screen.getByLabelText('Home'))
    await pressAndroidBack()
    expect(screen.queryByText('Quit Match?')).toBeNull()
    expect(rendered.getPathname()).toBe('/play/ginrummy')
  })

  it('a Home pressed after Cancel and a back after that each go their own way', async () => {
    const rendered = await openMatch()
    await play()
    await fireEvent.press(screen.getByLabelText('Home'))
    await fireEvent.press(screen.getByText('Cancel'))
    await pressAndroidBack()
    await fireEvent.press(screen.getByText('Quit'))
    expect(rendered.getPathname()).toBe('/loadout/ginrummy')
  })

  it('leaves at once once the match is over, and again after a rematch deals', async () => {
    const rendered = await openMatch()
    await play()
    await fireEvent.press(screen.getByLabelText('Win'))
    await fireEvent.press(screen.getByLabelText('Rematch'))
    await pressAndroidBack()
    expect(screen.queryByText('Quit Match?')).toBeNull()
    expect(rendered.getPathname()).toBe('/loadout/ginrummy')
  })

  it('leaves at once at the end of a match', async () => {
    const rendered = await openMatch()
    await play()
    await fireEvent.press(screen.getByLabelText('Win'))
    await fireEvent.press(screen.getByLabelText('Home'))
    expect(screen.queryByText('Quit Match?')).toBeNull()
    expect(rendered.getPathname()).toBe('/')
  })
})
