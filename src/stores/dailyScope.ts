import type { SolitaireGameId } from './statsTypes'

// Which Daily Deal the play screen on top is playing, if any. Set once as each solitaire play screen first renders
// (games/shared/useDailyDeal.ts), so everything under it knows without a prop through eleven screens: the saved-games store
// files the deal apart from the player's regular game, and GameChrome and the win card change for a Daily. Only one play screen is
// ever mounted. Kept apart from stores/daily.ts because GameChrome reads it and must not pull the whole store in.
export interface DailyScope {
  game: SolitaireGameId
  day: string
}

let scope: DailyScope | null = null

export function setDailyScope(next: DailyScope | null): void {
  scope = next
}

export const activeDailyScope = (): DailyScope | null => scope

/** A Daily Deal's save sits beside the player's regular one, under this suffix on their owner key. */
export const DAILY_OWNER_SUFFIX = '#daily'
