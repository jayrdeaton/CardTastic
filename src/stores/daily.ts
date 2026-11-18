import { localDateString } from '@tastic/achievements'
import { RULES_VERSION, type RunAction } from '@tastic/cardtastic-engine'

import { dailyPlayHref } from '@/components/daily/dailyRoutes'
import { GUEST_PLAYER_ID } from '@/constants/player'
import { dailyActions, type DailyDeal, type DailyPlayer, type DailyResult, type DailyState } from '@/redux/dailySlice'
import { store } from '@/redux/store'

import type { SolitaireGameId } from './statsTypes'

// The Daily Deals on Tastic-Server (its CLAUDE.md, "Daily leaderboards"): each solitaire game's default rules deal one shuffle a day,
// the same for everyone. Starting one starts the server's clock; a win goes to the server the moment it happens, which replays it
// with @tastic/cardtastic-engine and stops the clock. A player is anonymous, and shows on a public board only once they've said yes.

export const SERVER_URL = process.env.EXPO_PUBLIC_ONLINE_URL ?? 'https://play.infinitetoken.com'
const GAME = 'cardtastic'
// The server wants a name for every player and only ever shows it in games that have seats. No one's real name goes to it
const PLAYER_NAME = 'CardTastic'

export class DailyError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/** How a player shows on a board. */
export interface DailyLook {
  tag: string
  color: string
}

export interface DailyBoardEntry extends DailyResult {
  tag: string | null
  color: string | null
  you: boolean
}

export type DailyBoardYou = { started: boolean } | (DailyBoardEntry & { started: true; listed: boolean })

export interface DailyBoard {
  entries: DailyBoardEntry[]
  finished: number
  you: DailyBoardYou
}

/** Today, by the player's own calendar: a board holds one date's deal. */
export const localDay = (): string => localDateString(new Date())

const dailyState = (): DailyState | undefined => (store.getState() as { daily?: DailyState }).daily

/** Whose Daily this is: seat 1's profile, or guest. */
export const dailyOwner = (): string => (store.getState() as { profileSelection?: Record<1, string | null> }).profileSelection?.[1] ?? GUEST_PLAYER_ID

/** The deal the active player has started in `game` on `day`, if any. */
export const dailyDealFor = (game: SolitaireGameId, day: string): DailyDeal | null => {
  const deal = dailyState()?.deals[dailyOwner()]?.[game]
  return deal?.day === day ? deal : null
}

/** Remembers which Daily Deal a play screen opened on (`day`), or that it opened on the regular game (null). */
export function noteDailyInPlay(game: SolitaireGameId, day: string | null): void {
  const playing = dailyState()?.playing
  if (day) store.dispatch(dailyActions.playingSet({ owner: dailyOwner(), game, day }))
  else if (playing?.game === game) store.dispatch(dailyActions.playingSet(null))
}

/** Where a relaunch goes back into `game`: its Daily Deal, if that's what was left open and it's still today's and unfinished. Null
 * for the regular game. */
export function dailyResumeHref(game: string) {
  const playing = dailyState()?.playing
  if (!playing || playing.game !== game || playing.owner !== dailyOwner() || playing.day !== localDay()) return null
  const deal = dailyDealFor(playing.game, playing.day)
  return deal && !deal.result && !deal.unsent && !deal.refused ? dailyPlayHref(playing.game, playing.day) : null
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Game': GAME, 'X-Rules-Version': RULES_VERSION, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new DailyError(0, 'The Daily needs an internet connection')
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new DailyError(res.status, json.error ?? `The server answered ${res.status}`)
  return json
}

async function ensurePlayer(owner: string): Promise<DailyPlayer> {
  const known = dailyState()?.players[owner]
  if (known) return known
  const made = await call<{ player: { id: string }; token: string }>('POST', '/players', { name: PLAYER_NAME })
  const player: DailyPlayer = { id: made.player.id, token: made.token, listed: null, shownTag: null, shownColor: null }
  store.dispatch(dailyActions.playerMade({ owner, player }))
  return player
}

// Runs a call as `owner`'s player, making one if they have none. A token the server has stopped knowing makes a new player once.
async function asPlayer<T>(owner: string, run: (token: string) => Promise<T>): Promise<T> {
  const player = await ensurePlayer(owner)
  try {
    return await run(player.token)
  } catch (error) {
    if (!(error instanceof DailyError) || error.status !== 401) throw error
    store.dispatch(dailyActions.playerLost(owner))
    return run((await ensurePlayer(owner)).token)
  }
}

const dealPath = (day: string, game: SolitaireGameId) => `/daily/${day}/${game}`

/** Today's deal in `game` for the active player: its seed, and their clock, which starts now the first time. */
export async function startDailyDeal(game: SolitaireGameId): Promise<DailyDeal> {
  const owner = dailyOwner()
  const day = localDay()
  const started = await asPlayer(owner, (token) => call<Pick<DailyDeal, 'seed' | 'startedAt' | 'result'>>('POST', `${dealPath(day, game)}/start`, {}, token))
  store.dispatch(dailyActions.dealStarted({ owner, game, deal: { ...started, day } }))
  return dailyDealFor(game, day) as DailyDeal
}

/** A Daily win, kept until the server has it, and sent. */
export function submitDailyWin(game: SolitaireGameId, actions: RunAction[]): Promise<void> {
  store.dispatch(dailyActions.runWon({ owner: dailyOwner(), game, actions }))
  return sendDailyWin(game)
}

/** Sends the active player's unsent win in `game`. Fails only if the server can't be reached: it stays unsent, to be tried again. */
export async function sendDailyWin(game: SolitaireGameId): Promise<void> {
  const owner = dailyOwner()
  const deal = dailyState()?.deals[owner]?.[game]
  if (!deal?.unsent) return
  const { day, unsent } = deal
  try {
    const result = await asPlayer(owner, (token) => call<DailyResult>('POST', `${dealPath(day, game)}/run`, { actions: unsent }, token))
    store.dispatch(dailyActions.runPosted({ owner, game, result }))
  } catch (error) {
    if (!(error instanceof DailyError) || error.status === 0 || error.status >= 500 || error.status === 426 || error.status === 429) throw error
    // Already on the board (a retry whose first try got through): the server has the result
    if (error.status === 409) {
      const started = await asPlayer(owner, (token) => call<Pick<DailyDeal, 'seed' | 'startedAt' | 'result'>>('POST', `${dealPath(day, game)}/start`, {}, token)).catch(() => null)
      if (started?.result) {
        store.dispatch(dailyActions.runPosted({ owner, game, result: started.result }))
        return
      }
    }
    store.dispatch(dailyActions.runRefused({ owner, game }))
  }
}

export const fetchDailyBoard = (game: SolitaireGameId, day: string): Promise<DailyBoard> => asPlayer(dailyOwner(), (token) => call<DailyBoard>('GET', dealPath(day, game), undefined, token))

/** The active player's answer to showing on the public boards. A yes sends their tag and color with it. */
export async function setDailyListed(listed: boolean, look: DailyLook): Promise<void> {
  const owner = dailyOwner()
  await asPlayer(owner, (token) => call('PATCH', '/players/me', listed ? { listed, tag: look.tag, color: look.color } : { listed }, token))
  store.dispatch(dailyActions.playerChanged({ owner, changes: listed ? { listed, shownTag: look.tag, shownColor: look.color } : { listed } }))
}

/** Keeps a listed player's tag and color on the boards current. A tag the server won't show stays as it was there. */
export async function syncDailyLook(look: DailyLook): Promise<void> {
  const owner = dailyOwner()
  const player = dailyState()?.players[owner]
  if (!player?.listed || (player.shownTag === look.tag && player.shownColor === look.color)) return
  await call('PATCH', '/players/me', { tag: look.tag, color: look.color }, player.token)
  store.dispatch(dailyActions.playerChanged({ owner, changes: { shownTag: look.tag, shownColor: look.color } }))
}

/** Deletes what the server holds for players gone from this device. Anything it can't reach now is tried again next time. */
export async function flushDailyDeletions(): Promise<void> {
  for (const token of dailyState()?.orphans ?? []) {
    try {
      await call('DELETE', '/players/me', undefined, token)
    } catch (error) {
      if (!(error instanceof DailyError) || error.status !== 401) continue
    }
    store.dispatch(dailyActions.orphanDeleted(token))
  }
}

/** Takes the active player's scores off the server and forgets their player here. */
export function deleteDailyData(): Promise<void> {
  store.dispatch(dailyActions.forget(dailyOwner()))
  return flushDailyDeletions()
}
