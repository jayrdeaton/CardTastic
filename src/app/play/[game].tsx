import { PlayRoute } from '@tastic/shell'
import { useLocalSearchParams } from 'expo-router'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { usePortraitOnPhones } from '@/components/portraitOnPhones'
import { games } from '@/pack'
import { gameMetadata, GamePageTitle } from '@/utils/seo'

// Every game's play screen, by id (the shell's PlayRoute, which remembers it for a cold launch). The web build is a
// static export, so each game's page is listed here.
export function generateStaticParams(): { game: string }[] {
  return games.map((g) => ({ game: g.id }))
}

// The game's own title, description and link preview (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = (_request, { game }) => gameMetadata(game)

// A two-player game (one with a seat 2) holds a phone upright; the solitaire games follow the OS.
export default function Play() {
  const { game } = useLocalSearchParams<{ game: string }>()
  usePortraitOnPhones(games.some((g) => g.id === game && !!g.seatTwo))
  return (
    <>
      <GamePageTitle />
      <PlayRoute />
    </>
  )
}
