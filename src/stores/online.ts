import { RULES_VERSION } from '@tastic/cardtastic-engine'
import { createOnlinePlayers } from '@tastic/profile/online'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Each profile's player on Tastic-Server (@tastic/profile/online; HexFleet's ONLINE.md, section 9): a profile is the person online
// too, so each one that plays a Daily Deal has an anonymous player of its own, made the first time it does, deleted from the server
// with the profile (here, or in a sibling game sharing the roster) or by Settings' Delete Online Data. Its key lives in the Keychain on
// a phone and in the site's localStorage in a browser, under CardTastic's own keys. CardTastic has no pushes, so it hands in no
// notifications module. The Daily Deals' own calls (stores/daily.ts) are made as the profile's player through `online.call`.

export const SERVER_URL = process.env.EXPO_PUBLIC_ONLINE_URL ?? 'https://play.infinitetoken.com'

// The server wants a name for every player and only shows it to friends in games with invites. CardTastic has none, so no one's
// name goes to it: the boards show a tag and color, and only once the player has said yes
const PLAYER_NAME = 'CardTastic'

export const online = createOnlinePlayers({
  game: 'cardtastic',
  serverUrl: SERVER_URL,
  rulesVersion: RULES_VERSION,
  secureStore: Platform.OS === 'web' ? undefined : SecureStore,
  nameOf: () => PLAYER_NAME
})
