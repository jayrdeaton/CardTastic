import { PlayRoute } from '@tastic/shell'

import { games } from '@/pack'

// Every game's play screen, by id (the shell's PlayRoute, which remembers it for a cold launch). The web build is a
// static export, so each game's page is listed here.
export function generateStaticParams(): { game: string }[] {
  return games.map((g) => ({ game: g.id }))
}

export default PlayRoute
