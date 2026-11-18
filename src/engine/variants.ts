// The rules live in @tastic/cardtastic-engine, which Tastic-Server replays daily leaderboard runs with, so the app and the server
// can never play different rules. This file only re-exports its part of them, so the app's imports (and tests' mocks) stay put
export type { VariantId, VariantInfo } from '@tastic/cardtastic-engine'
export { canfieldVariant, fortyThievesVariant, gameOfVariant, golfVariant, klondikeVariant, scorpionVariant, spiderVariant, tripeaksVariant, VARIANT_IDS, variantInfo, VARIANTS, variantsOfGame } from '@tastic/cardtastic-engine'
