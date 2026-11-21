import { configureStore } from '@reduxjs/toolkit'
import { RULES_VERSION } from '@tastic/cardtastic-engine'
import { OnlineError } from '@tastic/profile/online'

import daily, { dailyActions } from '@/redux/dailySlice'
import { dailyDealFor, dailyErrorText, dailyResumeHref, fetchDailyBoard, followOnlinePlayers, localDay, noteDailyInPlay, sendDailyWin, setDailyListed, startDailyDeal, submitDailyWin, syncDailyLook } from '@/stores/daily'
import { online } from '@/stores/online'

// The app's side of the Daily Deals against a stand-in for Tastic-Server: each profile's own player (@tastic/profile/online, its key
// in a stand-in Keychain), who the server is told about, what's kept when it can't be reached, that nobody shows on a board without
// having said yes, and a profile's Daily going with its player.

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>()
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void values.set(key, value),
    deleteItemAsync: async (key: string) => void values.delete(key)
  }
})
jest.mock('@/redux/store', () => {
  const { configureStore: configure } = require('@reduxjs/toolkit')
  const reducer = require('@/redux/dailySlice').default
  const selection = { 1: 'kid' }
  const roster = [
    { id: 'kid', name: 'Kid', color: '#3b82f6', tag: 'K', createdAt: 0, updatedAt: 0 },
    { id: 'dad', name: 'Dad', color: '#ef4444', tag: 'D', createdAt: 0, updatedAt: 0 }
  ]
  return { selection, roster, store: configure({ reducer: { daily: reducer, profileSelection: () => selection, profiles: () => roster }, middleware: (defaults: (options: object) => unknown) => defaults({ immutableCheck: false, serializableCheck: false }) }) }
})
const { selection: mockSelection, roster, store } = jest.requireMock('@/redux/store') as { selection: { 1: string | null }; roster: { id: string; name: string }[]; store: ReturnType<typeof configureStore<{ daily: ReturnType<typeof daily> }>> }

type Reply = { status?: number; body?: unknown } | 'offline'
const calls: { method: string; path: string; body: unknown; token?: string; headers: Record<string, string> }[] = []
let reply: (method: string, path: string, token?: string) => Reply
let made = 0

const DEAL = { seed: 77, startedAt: '2026-11-18T10:00:00.000Z', result: null }
const RESULT = { moves: 120, seconds: 90, score: 210, rank: 3 }
const today = localDay()
const usual = (method: string, path: string): Reply => {
  if (method === 'POST' && path === '/players') return { status: 201, body: { player: { id: `p${++made}`, name: 'CardTastic' }, token: `token-${made}` } }
  if (path.endsWith('/start')) return { body: DEAL }
  if (path.endsWith('/run')) return { body: RESULT }
  return { body: {} }
}

let stopFollowing = () => {}

beforeEach(async () => {
  mockSelection[1] = 'kid'
  roster.splice(2)
  reply = usual
  global.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    const headers = init.headers as Record<string, string>
    const token = headers.Authorization?.replace('Bearer ', '')
    calls.push({ method: init.method as string, path, body: init.body ? JSON.parse(init.body as string) : undefined, token, headers })
    const answer = reply(init.method as string, path, token)
    if (answer === 'offline') throw new TypeError('Network request failed')
    const status = answer.status ?? 200
    return { ok: status < 400, status, json: async () => answer.body ?? {} } as Response
  }) as unknown as typeof fetch
  // Every test starts with no players on the device, and nothing kept here
  await online.removeAll()
  store.dispatch(dailyActions.playersKept([]))
  store.dispatch(dailyActions.playingSet(null))
  stopFollowing = followOnlinePlayers()
  await online.load()
  calls.length = 0
})

afterEach(() => stopFollowing())

const players = () => store.getState().daily.players
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('starting a Daily Deal', () => {
  it("makes one anonymous player per profile, sends no one's name, and keeps the deal", async () => {
    const deal = await startDailyDeal('klondike')
    expect(deal).toMatchObject({ day: today, seed: 77, result: null, unsent: null })
    expect(dailyDealFor('klondike', today)?.seed).toBe(77)
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/players', body: { name: 'CardTastic' } })
    expect(calls[0].headers).toMatchObject({ 'X-Game': 'cardtastic', 'X-Rules-Version': RULES_VERSION })
    const kid = online.playerOf('kid')
    expect(calls[1]).toMatchObject({ method: 'POST', path: `/daily/${today}/klondike/start`, token: kid?.token })
    expect(players().kid).toMatchObject({ player: kid?.id, listed: null })

    await startDailyDeal('spider')
    expect(calls.filter((c) => c.path === '/players')).toHaveLength(1)
    mockSelection[1] = 'dad'
    expect(dailyDealFor('klondike', today)).toBeNull()
    await startDailyDeal('klondike')
    expect(online.players().map((p) => p.profileId)).toEqual(['kid', 'dad'])
    expect(calls.filter((c) => c.path === '/players').map((c) => c.body)).toEqual([{ name: 'CardTastic' }, { name: 'CardTastic' }])
  })

  it("is never Guest's: Today's Deal makes them a profile first", async () => {
    mockSelection[1] = null
    await expect(startDailyDeal('klondike')).rejects.toThrow('Pick a profile to play the Daily')
    expect(calls).toHaveLength(0)
    expect(online.players()).toHaveLength(0)
  })

  it("makes a new player when the server no longer knows the key, and starts the profile's Daily over", async () => {
    await startDailyDeal('klondike')
    await setDailyListed(true, { tag: 'K', color: '#3b82f6' })
    const lost = online.playerOf('kid')?.token
    reply = (method, path, token) => (token === lost ? { status: 401, body: { error: 'Not signed in' } } : usual(method, path))
    await expect(startDailyDeal('spider')).resolves.toMatchObject({ seed: 77 })
    const kid = online.playerOf('kid')
    expect(kid?.token).not.toBe(lost)
    expect(players().kid).toEqual({ player: kid?.id, listed: null, shownTag: null, shownColor: null })
    expect(dailyDealFor('klondike', today)).toBeNull()
    expect(dailyDealFor('spider', today)?.seed).toBe(77)
  })

  it('says the Daily needs the internet when the server cannot be reached', async () => {
    reply = () => 'offline'
    const failure = await startDailyDeal('klondike').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(OnlineError)
    expect(failure).toMatchObject({ status: 0 })
    expect(dailyErrorText(failure)).toBe('The Daily needs an internet connection')
  })
})

describe('a Daily win', () => {
  const actions = [['tableau', 0, 'foundation', 0, 1], 'd', 'u'] as never[]

  it('goes to the server with its run, and keeps the result', async () => {
    await startDailyDeal('klondike')
    await submitDailyWin('klondike', actions)
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: `/daily/${today}/klondike/run`, body: { actions }, token: online.playerOf('kid')?.token })
    expect(dailyDealFor('klondike', today)).toMatchObject({ result: RESULT, unsent: null, refused: false })
  })

  it('is kept when the server cannot be reached, and sent next time', async () => {
    await startDailyDeal('klondike')
    reply = () => 'offline'
    await expect(submitDailyWin('klondike', actions)).rejects.toBeInstanceOf(OnlineError)
    expect(dailyDealFor('klondike', today)).toMatchObject({ unsent: actions, result: null })
    reply = usual
    await sendDailyWin('klondike')
    expect(dailyDealFor('klondike', today)).toMatchObject({ unsent: null, result: RESULT })
  })

  it('takes the result the server already has when a retry finds the win there', async () => {
    await startDailyDeal('klondike')
    reply = (method, path) => {
      if (path.endsWith('/run')) return { status: 409, body: { error: 'This deal is already on the board' } }
      if (path.endsWith('/start')) return { body: { ...DEAL, result: RESULT } }
      return usual(method, path)
    }
    await submitDailyWin('klondike', actions)
    expect(dailyDealFor('klondike', today)).toMatchObject({ result: RESULT, unsent: null, refused: false })
  })

  it('stops trying a run the rules refused', async () => {
    await startDailyDeal('klondike')
    reply = (method, path) => (path.endsWith('/run') ? { status: 400, body: { error: "Can't make that move (action 3)" } } : usual(method, path))
    await submitDailyWin('klondike', actions)
    expect(dailyDealFor('klondike', today)).toMatchObject({ refused: true, unsent: null, result: null })
  })
})

describe('the public boards', () => {
  const look = { tag: 'KID', color: '#3b82f6' }

  it('sends a tag and color only with a yes', async () => {
    await startDailyDeal('klondike')
    await setDailyListed(false, look)
    expect(calls.at(-1)?.body).toEqual({ listed: false })
    expect(players().kid.listed).toBe(false)
    await syncDailyLook(look)
    expect(calls.at(-1)?.body).toEqual({ listed: false })

    await setDailyListed(true, look)
    expect(calls.at(-1)?.body).toEqual({ listed: true, tag: 'KID', color: '#3b82f6' })
    expect(players().kid).toMatchObject({ listed: true, shownTag: 'KID' })
  })

  it('keeps a listed player current, once per change', async () => {
    await startDailyDeal('klondike')
    await setDailyListed(true, look)
    const before = calls.length
    await syncDailyLook(look)
    expect(calls).toHaveLength(before)
    await syncDailyLook({ tag: 'K', color: '#3b82f6' })
    expect(calls.at(-1)?.body).toEqual({ tag: 'K', color: '#3b82f6' })
  })

  it('reads a board as the profile', async () => {
    await startDailyDeal('klondike')
    reply = () => ({ body: { entries: [], finished: 0, you: { started: true } } })
    await expect(fetchDailyBoard('klondike', today)).resolves.toMatchObject({ finished: 0 })
    expect(calls.at(-1)).toMatchObject({ method: 'GET', path: `/daily/${today}/klondike`, token: online.playerOf('kid')?.token })
  })
})

describe('a relaunch', () => {
  const href = { pathname: '/play/[game]', params: { game: 'klondike', daily: today } }

  it('goes back to the Daily left open', async () => {
    await startDailyDeal('klondike')
    expect(dailyResumeHref('klondike')).toBeNull()
    noteDailyInPlay('klondike', today)
    expect(dailyResumeHref('klondike')).toEqual(href)
    expect(dailyResumeHref('spider')).toBeNull()
  })

  it('goes to the regular game once that was the one opened', async () => {
    await startDailyDeal('klondike')
    noteDailyInPlay('klondike', today)
    noteDailyInPlay('spider', null)
    expect(dailyResumeHref('klondike')).toEqual(href)
    noteDailyInPlay('klondike', null)
    expect(dailyResumeHref('klondike')).toBeNull()
  })

  it('leaves a finished Daily, another player and another day alone', async () => {
    await startDailyDeal('klondike')
    noteDailyInPlay('klondike', today)
    mockSelection[1] = 'dad'
    expect(dailyResumeHref('klondike')).toBeNull()
    mockSelection[1] = 'kid'
    noteDailyInPlay('klondike', '2020-01-01')
    expect(dailyResumeHref('klondike')).toBeNull()
    noteDailyInPlay('klondike', today)
    await submitDailyWin('klondike', ['d'])
    expect(dailyResumeHref('klondike')).toBeNull()
  })
})

describe('deleting', () => {
  it("takes a deleted profile's player off the server, and its Daily with it", async () => {
    await startDailyDeal('klondike')
    mockSelection[1] = 'dad'
    await startDailyDeal('klondike')
    const dad = online.playerOf('dad')
    await online.sync(roster.filter((p) => p.id !== 'dad'))
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/players/me', token: dad?.token })
    expect(Object.keys(players())).toEqual(['kid'])
    expect(dailyDealFor('klondike', today)).toBeNull()
    mockSelection[1] = 'kid'
    expect(dailyDealFor('klondike', today)?.seed).toBe(77)
  })

  it("Delete Online Data takes every profile's player off the server, and every Daily here", async () => {
    await startDailyDeal('klondike')
    mockSelection[1] = 'dad'
    await startDailyDeal('klondike')
    await online.removeAll()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(2)
    expect(players()).toEqual({})
    expect(store.getState().daily.deals).toEqual({})
  })

  it('forgets the Daily of profiles whose players are gone when the players load', async () => {
    await startDailyDeal('klondike')
    stopFollowing()
    store.dispatch(dailyActions.playerJoined({ owner: 'dad', player: 'gone' }))
    stopFollowing = followOnlinePlayers()
    await flush()
    expect(Object.keys(players())).toEqual(['kid'])
  })
})
