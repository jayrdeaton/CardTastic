import { configureStore } from '@reduxjs/toolkit'
import { RULES_VERSION } from '@tastic/cardtastic-engine'

import daily, { dailyActions } from '@/redux/dailySlice'
import { dailyDealFor, DailyError, dailyResumeHref, deleteDailyData, fetchDailyBoard, flushDailyDeletions, localDay, noteDailyInPlay, sendDailyWin, setDailyListed, startDailyDeal, submitDailyWin, syncDailyLook } from '@/stores/daily'

// The app's side of the Daily Deals against a stand-in for Tastic-Server: who the server is told about, what's kept when it can't be
// reached, and that nobody shows on a board without having said yes.

jest.mock('@/redux/store', () => {
  const { configureStore: configure } = require('@reduxjs/toolkit')
  const reducer = require('@/redux/dailySlice').default
  const selection = { 1: 'kid' }
  return { selection, store: configure({ reducer: { daily: reducer, profileSelection: () => selection }, middleware: (defaults: (options: object) => unknown) => defaults({ immutableCheck: false, serializableCheck: false }) }) }
})
const { selection: mockSelection, store } = jest.requireMock('@/redux/store') as { selection: { 1: string | null }; store: ReturnType<typeof configureStore<{ daily: ReturnType<typeof daily> }>> }

type Reply = { status?: number; body?: unknown } | 'offline'
const calls: { method: string; path: string; body: unknown; token?: string; headers: Record<string, string> }[] = []
let reply: (method: string, path: string, token?: string) => Reply

const DEAL = { seed: 77, startedAt: '2026-11-18T10:00:00.000Z', result: null }
const RESULT = { moves: 120, seconds: 90, score: 210, rank: 3 }
const today = localDay()

beforeEach(() => {
  calls.length = 0
  mockSelection[1] = 'kid'
  for (const owner of ['kid', 'dad', 'guest']) {
    store.dispatch(dailyActions.forget(owner))
  }
  store.dispatch(dailyActions.playingSet(null))
  for (const token of store.getState().daily.orphans) store.dispatch(dailyActions.orphanDeleted(token))
  let made = 0
  reply = (method, path) => {
    if (method === 'POST' && path === '/players') return { status: 201, body: { player: { id: `p${++made}` }, token: `token-${made}` } }
    if (path.endsWith('/start')) return { body: DEAL }
    if (path.endsWith('/run')) return { body: RESULT }
    return { body: {} }
  }
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
})

const players = () => store.getState().daily.players

describe('starting a Daily Deal', () => {
  it("makes one anonymous player per profile, sends no one's name, and keeps the deal", async () => {
    const deal = await startDailyDeal('klondike')
    expect(deal).toMatchObject({ day: today, seed: 77, result: null, unsent: null })
    expect(dailyDealFor('klondike', today)?.seed).toBe(77)
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/players', body: { name: 'CardTastic' } })
    expect(calls[0].headers).toMatchObject({ 'X-Game': 'cardtastic', 'X-Rules-Version': RULES_VERSION })
    expect(calls[1]).toMatchObject({ method: 'POST', path: `/daily/${today}/klondike/start`, token: 'token-1' })
    expect(players().kid).toMatchObject({ token: 'token-1', listed: null })

    await startDailyDeal('spider')
    expect(calls.filter((c) => c.path === '/players')).toHaveLength(1)
    mockSelection[1] = null
    expect(dailyDealFor('klondike', today)).toBeNull()
    await startDailyDeal('klondike')
    expect(players().guest.token).toBe('token-2')
  })

  it('makes a new player when the server no longer knows the token', async () => {
    await startDailyDeal('klondike')
    const usual = reply
    reply = (method, path, token) => (token === 'token-1' ? { status: 401, body: { error: 'Not signed in' } } : usual(method, path, token))
    await expect(startDailyDeal('klondike')).resolves.toMatchObject({ seed: 77 })
    expect(players().kid.token).toBe('token-2')
  })

  it('says the Daily needs the internet when the server cannot be reached', async () => {
    reply = () => 'offline'
    const failure = await startDailyDeal('klondike').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(DailyError)
    expect(failure).toMatchObject({ status: 0, message: 'The Daily needs an internet connection' })
  })
})

describe('a Daily win', () => {
  const actions = [['tableau', 0, 'foundation', 0, 1], 'd', 'u'] as never[]

  it('goes to the server with its run, and keeps the result', async () => {
    await startDailyDeal('klondike')
    await submitDailyWin('klondike', actions)
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: `/daily/${today}/klondike/run`, body: { actions }, token: 'token-1' })
    expect(dailyDealFor('klondike', today)).toMatchObject({ result: RESULT, unsent: null, refused: false })
  })

  it('is kept when the server cannot be reached, and sent next time', async () => {
    await startDailyDeal('klondike')
    const usual = reply
    reply = () => 'offline'
    await expect(submitDailyWin('klondike', actions)).rejects.toBeInstanceOf(DailyError)
    expect(dailyDealFor('klondike', today)).toMatchObject({ unsent: actions, result: null })
    reply = usual
    await sendDailyWin('klondike')
    expect(dailyDealFor('klondike', today)).toMatchObject({ unsent: null, result: RESULT })
  })

  it('takes the result the server already has when a retry finds the win there', async () => {
    await startDailyDeal('klondike')
    const usual = reply
    reply = (method, path, token) => {
      if (path.endsWith('/run')) return { status: 409, body: { error: 'This deal is already on the board' } }
      if (path.endsWith('/start')) return { body: { ...DEAL, result: RESULT } }
      return usual(method, path, token)
    }
    await submitDailyWin('klondike', actions)
    expect(dailyDealFor('klondike', today)).toMatchObject({ result: RESULT, unsent: null, refused: false })
  })

  it('stops trying a run the rules refused', async () => {
    await startDailyDeal('klondike')
    const usual = reply
    reply = (method, path, token) => (path.endsWith('/run') ? { status: 400, body: { error: "Can't make that move (action 3)" } } : usual(method, path, token))
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

  it('reads a board as the player', async () => {
    await startDailyDeal('klondike')
    reply = () => ({ body: { entries: [], finished: 0, you: { started: true } } })
    await expect(fetchDailyBoard('klondike', today)).resolves.toMatchObject({ finished: 0 })
    expect(calls.at(-1)).toMatchObject({ method: 'GET', path: `/daily/${today}/klondike`, token: 'token-1' })
  })
})

describe('a relaunch', () => {
  const daily = { pathname: '/play/[game]', params: { game: 'klondike', daily: today } }

  it('goes back to the Daily left open', async () => {
    await startDailyDeal('klondike')
    expect(dailyResumeHref('klondike')).toBeNull()
    noteDailyInPlay('klondike', today)
    expect(dailyResumeHref('klondike')).toEqual(daily)
    expect(dailyResumeHref('spider')).toBeNull()
  })

  it('goes to the regular game once that was the one opened', async () => {
    await startDailyDeal('klondike')
    noteDailyInPlay('klondike', today)
    noteDailyInPlay('spider', null)
    expect(dailyResumeHref('klondike')).toEqual(daily)
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
  it("takes a player's scores off the server and forgets them here", async () => {
    await startDailyDeal('klondike')
    await deleteDailyData()
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/players/me', token: 'token-1' })
    expect(players().kid).toBeUndefined()
    expect(dailyDealFor('klondike', today)).toBeNull()
    expect(store.getState().daily.orphans).toEqual([])
  })

  it('tries again later when the server cannot be reached', async () => {
    await startDailyDeal('klondike')
    const usual = reply
    reply = () => 'offline'
    await deleteDailyData()
    expect(store.getState().daily.orphans).toEqual(['token-1'])
    reply = usual
    await flushDailyDeletions()
    expect(store.getState().daily.orphans).toEqual([])
  })
})
