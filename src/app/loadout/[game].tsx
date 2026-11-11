import { LoadoutRoute } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { usePortraitOnPhones } from '@/components/portraitOnPhones'
import { games } from '@/pack'
import { gameMetadata, GamePageTitle } from '@/utils/seo'

// A two-player game's setup screen (the shell's LoadoutRoute): who sits in seat 2 and the match's rules, before a play
// screen. A game with nothing to set up never comes here. The web build is a static export, so each such game's page is
// listed here.
export function generateStaticParams(): { game: string }[] {
  return games.filter((g) => g.useLoadout).map((g) => ({ game: g.id }))
}

// The game's own title, description and link preview (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = (_request, { game }) => gameMetadata(game)

// Only two-player games have one, so it holds a phone upright, like their play screens.
export default function Loadout() {
  usePortraitOnPhones()
  return (
    <>
      <GamePageTitle />
      <LoadoutRoute />
    </>
  )
}
