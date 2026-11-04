import { LoadoutRoute } from '@tastic/shell'

import { games } from '@/pack'

// A two-player game's setup screen (the shell's LoadoutRoute): who sits in seat 2 and the match's rules, before a play
// screen. A game with nothing to set up never comes here. The web build is a static export, so each such game's page is
// listed here.
export function generateStaticParams(): { game: string }[] {
  return games.filter((g) => g.useLoadout).map((g) => ({ game: g.id }))
}

export default LoadoutRoute
