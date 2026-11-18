import type { Href } from 'expo-router'

/** A game's setup screen, where its play screen's back arrow goes. */
export const gameSetupHref = (game: string) => ({ pathname: '/loadout/[game]', params: { game } }) as unknown as Href
