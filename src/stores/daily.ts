import { localDateString } from '@tastic/achievements'
import type { RunAction } from '@tastic/cardtastic-engine'
import { OnlineError } from '@tastic/profile/online'

import { dailyPlayHref } from '@/components/daily/dailyRoutes'
import { dailyHistoryActions } from '@/redux/dailyHistorySlice'
import { dailyActions, type DailyDeal, type DailyResult, type DailyState } from '@/redux/dailySlice'
import { store } from '@/redux/store'

import { online } from './online'
import type { SolitaireGameId } from './statsTypes'

// The Daily Deals on Tastic-Server (its CLAUDE.md, "Daily leaderboards"): each solitaire game's default rules deal one shuffle a day,
// the same for everyone. Starting one starts the server's clock; a win goes to the server the moment it happens, which replays it
// with @tastic/cardtastic-engine and stops the clock. Every call is made as the profile's own anonymous player (stores/online.ts),
// which shows on a public board only once they've said yes.

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

/** What to tell the player about a failed Daily call. */
export function dailyErrorText(error: unknown): string {
  if (error instanceof OnlineError && error.status === 0) return 'The Daily needs an internet connection'
  return error instanceof Error ? error.message : 'Something went wrong'
}

/** Today, by the player's own calendar: a board holds one date's deal. */
export const localDay = (): string => localDateString(new Date())

type OwnerState = { daily?: DailyState; profileSelection?: Record<1, string | null>; profiles?: { id: string; name: string }[] }
const state = (): OwnerState => store.getState() as OwnerState
const dailyState = (): DailyState | undefined => state().daily

/** Whose Daily this is: seat 1's profile. A Daily is always a profile's, never Guest's (null). */
export const dailyOwner = (): string | null => state().profileSelection?.[1] ?? null

/** The deal the active profile has started in `game` on `day`, if any. */
export const dailyDealFor = (game: SolitaireGameId, day: string): DailyDeal | null => {
  const owner = dailyOwner()
  const deal = owner ? dailyState()?.deals[owner]?.[game] : undefined
  return deal?.day === day ? deal : null
}

/** Remembers which Daily Deal a play screen opened on (`day`), or that it opened on the regular game (null). */
export function noteDailyInPlay(game: SolitaireGameId, day: string | null): void {
  const playing = dailyState()?.playing
  const owner = dailyOwner()
  if (day && owner) store.dispatch(dailyActions.playingSet({ owner, game, day }))
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

// Seat 1's profile. Today's Deal asks a guest's name and makes them one first (components/daily/NamePrompt.tsx)
function activeOwner(guest = 'Pick a profile to play the Daily'): string {
  const owner = dailyOwner()
  if (!owner) throw new Error(guest)
  return owner
}

// The profile's player, made the first time it goes online. A player other than the one on file (the server lost the last one)
// starts the profile's Daily over
async function join(owner: string): Promise<void> {
  const profile = state().profiles?.find((p) => p.id === owner)
  if (!profile) throw new Error('Pick a profile to play the Daily')
  const player = await online.ensure(profile)
  store.dispatch(dailyActions.playerJoined({ owner, player: player.id }))
}

// A call as `owner`'s player. A key the server refuses (it no longer knows the player) is forgotten by the call, so the retry makes a
// new player, once
async function asPlayer<T>(owner: string, method: string, path: string, body?: unknown): Promise<T> {
  await join(owner)
  try {
    return await online.call<T>(owner, method, path, body)
  } catch (error) {
    if (!(error instanceof OnlineError) || error.status !== 401) throw error
    await join(owner)
    return online.call<T>(owner, method, path, body)
  }
}

const dealPath = (day: string, game: SolitaireGameId) => `/daily/${day}/${game}`

// A Daily the server took, in the history of the player that won it (the Records tab's calendar)
function noteWin(owner: string, day: string, game: SolitaireGameId) {
  const player = dailyState()?.players[owner]?.player
  if (player) store.dispatch(dailyHistoryActions.won({ player, day, game }))
}

/** Today's deal in `game` for the active profile: its seed, and their clock, which starts now the first time. */
export async function startDailyDeal(game: SolitaireGameId): Promise<DailyDeal> {
  const owner = activeOwner()
  const day = localDay()
  const started = await asPlayer<Pick<DailyDeal, 'seed' | 'startedAt' | 'result'>>(owner, 'POST', `${dealPath(day, game)}/start`, {})
  store.dispatch(dailyActions.dealStarted({ owner, game, deal: { ...started, day } }))
  if (started.result) noteWin(owner, day, game)
  return dailyDealFor(game, day) as DailyDeal
}

/** A Daily win, kept until the server has it, and sent. */
export function submitDailyWin(game: SolitaireGameId, actions: RunAction[]): Promise<void> {
  const owner = dailyOwner()
  if (!owner) return Promise.resolve()
  store.dispatch(dailyActions.runWon({ owner, game, actions }))
  return sendDailyWin(game)
}

/** Sends the active profile's unsent win in `game`. Fails only if the server can't be reached: it stays unsent, to be tried again. */
export async function sendDailyWin(game: SolitaireGameId): Promise<void> {
  const owner = dailyOwner()
  const deal = owner ? dailyState()?.deals[owner]?.[game] : undefined
  if (!owner || !deal?.unsent) return
  const { day, unsent } = deal
  try {
    const result = await asPlayer<DailyResult>(owner, 'POST', `${dealPath(day, game)}/run`, { actions: unsent })
    store.dispatch(dailyActions.runPosted({ owner, game, result }))
    noteWin(owner, day, game)
  } catch (error) {
    if (!(error instanceof OnlineError) || error.status === 0 || error.status >= 500 || error.status === 426 || error.status === 429) throw error
    // Already on the board (a retry whose first try got through): the server has the result
    if (error.status === 409) {
      const started = await asPlayer<Pick<DailyDeal, 'seed' | 'startedAt' | 'result'>>(owner, 'POST', `${dealPath(day, game)}/start`, {}).catch(() => null)
      if (started?.result) {
        store.dispatch(dailyActions.runPosted({ owner, game, result: started.result }))
        noteWin(owner, day, game)
        return
      }
    }
    store.dispatch(dailyActions.runRefused({ owner, game }))
  }
}

/** A game's board on `day`, read as the active profile's player (made now if they have none: the server shows each player where
 * they stand). */
export const fetchDailyBoard = (game: SolitaireGameId, day: string): Promise<DailyBoard> => asPlayer<DailyBoard>(activeOwner("Pick a profile to see today's board"), 'GET', dealPath(day, game))

/** A profile's answer to showing on the public boards (the active one's, by default; any one from its Edit Profile screen). A yes
 * sends their tag and color with it. */
export async function setDailyListed(listed: boolean, look: DailyLook, owner: string = activeOwner()): Promise<void> {
  await asPlayer(owner, 'PATCH', '/players/me', listed ? { listed, tag: look.tag, color: look.color } : { listed })
  store.dispatch(dailyActions.playerChanged({ owner, changes: listed ? { listed, shownTag: look.tag, shownColor: look.color } : { listed } }))
}

/** Keeps a listed profile's tag and color on the boards current. A tag the server won't show stays as it was there. */
export async function syncDailyLook(look: DailyLook): Promise<void> {
  const owner = dailyOwner()
  const player = owner ? dailyState()?.players[owner] : undefined
  if (!owner || !player?.listed || (player.shownTag === look.tag && player.shownColor === look.color)) return
  await online.call(owner, 'PATCH', '/players/me', { tag: look.tag, color: look.color })
  store.dispatch(dailyActions.playerChanged({ owner, changes: { shownTag: look.tag, shownColor: look.color } }))
}

/** Forgets the Daily of every profile whose server player is gone from this device (deleted with the profile, by Delete Online Data,
 * or forgotten when the server refused its key), once the players have loaded and whenever they change. */
export function followOnlinePlayers(): () => void {
  let stopped = false
  let unsubscribe = () => {}
  const keep = () => store.dispatch(dailyActions.playersKept(online.players().map((p) => ({ owner: p.profileId, player: p.id }))))
  void online.load().then(() => {
    if (stopped) return
    keep()
    unsubscribe = online.subscribe(keep)
  })
  return () => {
    stopped = true
    unsubscribe()
  }
}
