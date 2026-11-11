import { HomeScreen } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { HOME_TITLE, homeMetadata, PageTitle } from '@/utils/seo'

// The web page's title, description and link preview (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = homeMetadata

// Home is @tastic/shell's: the hero, seat 1's button, every game as a tile, the trophy and the cog, and a cold launch
// straight back into the game the player left (each game's `resumable`).
export default function Home() {
  return (
    <>
      <PageTitle title={HOME_TITLE} />
      <HomeScreen />
    </>
  )
}
