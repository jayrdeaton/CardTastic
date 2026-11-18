import type { Href } from 'expo-router'

import type { SolitaireGameId } from '@/stores/statsTypes'

/** A game's play screen, opened for its Daily Deal of `day` (games/shared/useDailyDeal.ts). */
export const dailyPlayHref = (game: SolitaireGameId, day: string) => ({ pathname: '/play/[game]', params: { game, daily: day } }) as unknown as Href

/** A game's Daily board. */
export const dailyBoardHref = (game: SolitaireGameId) => ({ pathname: '/daily/[game]', params: { game } }) as unknown as Href
