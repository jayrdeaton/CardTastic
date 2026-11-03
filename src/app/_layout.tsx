import { RootLayout } from '@tastic/shell'

import { pack } from '@/pack'
import { packStore, persistor } from '@/redux/store'

// The root is @tastic/shell's, handed the pack (pack.ts) and its store (redux/store.ts).
export default function Layout() {
  return <RootLayout pack={pack} store={packStore} persistor={persistor} />
}
