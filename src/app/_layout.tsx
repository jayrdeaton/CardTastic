import { setReloadSplash } from '@rific/updater'
import { RootLayout } from '@tastic/shell'

import { pack } from '@/pack'
import { packStore, persistor } from '@/redux/store'

// An OTA update restarts the app behind its splash (app.json's splash image), not expo-updates' white loading
// screen. @rific/updater takes the colors from app.json itself.
setReloadSplash({ image: require('../../assets/images/splash-light.png') })

// The root is @tastic/shell's, handed the pack (pack.ts) and its store (redux/store.ts).
export default function Layout() {
  return <RootLayout pack={pack} store={packStore} persistor={persistor} />
}
