import { ProfilesRoute } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { PageTitle, screenMetadata, screenTitle } from '@/utils/seo'

// Kept out of search results (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = () => screenMetadata('Profiles', '/profiles')

// Profiles is @tastic/shell's: @tastic/profile's roster, turned with the phone, its column capped at 640pt sideways, a
// new profile starting on the seat color (the pack's `newProfileColor`) and the color swatch placed in the turned frame
// (the pack's `usePickerAlign`). A deleted profile's stats, achievements, saved deals, records, settings and color pick
// go with it: the shell's deleteProfile dispatches @tastic/profile's remove, which every reducer keeping something per
// player answers (onProfileRemoved, redux/packReducers.ts).
export default function Profiles() {
  return (
    <>
      <PageTitle title={screenTitle('Profiles')} />
      <ProfilesRoute />
    </>
  )
}
