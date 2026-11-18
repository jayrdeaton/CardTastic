import type { GenerateMetadataFunction } from 'expo-router/server'

import { DailyBoardScreen } from '@/components/daily/DailyBoardScreen'
import { SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'
import { PageTitle, screenMetadata, screenTitle } from '@/utils/seo'

// A solitaire game's Daily board. The web build is a static export, so each game's page is listed here.
export function generateStaticParams(): { game: string }[] {
  return SOLITAIRE_GAME_IDS.map((game) => ({ game }))
}

// Kept out of search results (src/utils/seo.tsx): it changes every day
export const generateMetadata: GenerateMetadataFunction = (_request, { game }) => screenMetadata('Daily Board', `/daily/${game}`)

export default function DailyBoard() {
  return (
    <>
      <PageTitle title={screenTitle('Daily Board')} />
      <DailyBoardScreen />
    </>
  )
}
