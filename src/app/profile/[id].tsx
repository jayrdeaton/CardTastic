import { EditProfileRoute } from '@tastic/shell'
import type { GenerateMetadataFunction } from 'expo-router/server'

import { PageTitle, screenMetadata, screenTitle } from '@/utils/seo'

// Kept out of search results (src/utils/seo.tsx). A client route: the static web export has no page per profile
export const generateMetadata: GenerateMetadataFunction = (_request, { id }) => screenMetadata('Edit Profile', `/profile/${id}`)

// One profile's Edit Profile screen is @tastic/shell's (@tastic/profile's EditProfileScreen), pushed from Profiles with the
// profile's id or 'new': Name, Tag and Color, saved as it's left by any way back. A new profile starts on the seat color
// (the pack's `newProfileColor`). Deleting one takes its stats, achievements, saved deals, records, settings and color pick
// with it, through @tastic/profile's remove, which every reducer keeping something per player answers (onProfileRemoved,
// redux/packReducers.ts), and its Daily Deal player off the server (stores/online.ts' sync).
export default function EditProfile() {
  return (
    <>
      <PageTitle title={screenTitle('Edit Profile')} />
      <EditProfileRoute />
    </>
  )
}
