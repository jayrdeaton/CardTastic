import { StatsScreen } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { PageTitle, screenMetadata, screenTitle } from '@/utils/seo'

// Kept out of search results (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = () => screenMetadata('Stats', '/stats')

// The stats screen is @tastic/shell's: the Stats, Records and Achievements tabs, the player and game pickers, opening on
// whoever is playing, and Reset. What it shows is Solitaire's (the pack's stats options, components/SolitaireStats.tsx).
export default function Stats() {
  return (
    <>
      <PageTitle title={screenTitle('Stats')} />
      <StatsScreen />
    </>
  )
}
