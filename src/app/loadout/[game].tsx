import { LoadoutRoute } from '@tastic/shell'
import { useLocalSearchParams } from 'expo-router'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { usePortraitOnPhones } from '@/components/portraitOnPhones'
import { games } from '@/pack'
import { gameMetadata, GamePageTitle } from '@/utils/seo'

// A game's setup screen (the shell's LoadoutRoute): a two-player game's seat 2 and rules, a solitaire game's rules and Daily
// Deal, before a play screen. A game with nothing to set up never comes here. The web build is a static export, so each such game's page is
// listed here.
export function generateStaticParams(): { game: string }[] {
  return games.filter((g) => g.useLoadout).map((g) => ({ game: g.id }))
}

// The game's own title, description and link preview (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = (_request, { game }) => gameMetadata(game)

// A two-player game's holds a phone upright, like its play screen.
export default function Loadout() {
  const { game } = useLocalSearchParams<{ game: string }>()
  usePortraitOnPhones(!!games.find((g) => g.id === game)?.seatTwo)
  return (
    <>
      <GamePageTitle />
      <LoadoutRoute />
    </>
  )
}
