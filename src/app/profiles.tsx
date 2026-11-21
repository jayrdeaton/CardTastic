import { ProfilesRoute } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { PageTitle, screenMetadata, screenTitle } from '@/utils/seo'

// Kept out of search results (src/utils/seo.tsx)
export const generateMetadata: GenerateMetadataFunction = () => screenMetadata('Profiles', '/profiles')

// Profiles is @tastic/shell's: @tastic/profile's roster, its column capped at 640pt sideways. A profile, or New Profile,
// opens its own Edit Profile screen (profile/[id].tsx), where profiles are made, saved and deleted.
export default function Profiles() {
  return (
    <>
      <PageTitle title={screenTitle('Profiles')} />
      <ProfilesRoute />
    </>
  )
}
