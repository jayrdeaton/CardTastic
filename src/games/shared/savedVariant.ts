import { canfieldVariant, fortyThievesVariant, golfVariant, klondikeVariant, scorpionVariant, spiderVariant, tripeaksVariant, type VariantId } from '@/engine/variants'
import type { SolitaireGameId } from '@/stores/statsTypes'

/** The rule set a saved game was dealt under, from its save's `config` (each ruled game's screen writes its rule there; see
 * SavedGame's doc comment). A save with none (made before it was kept) counts under the game's default rules. */
export function variantOfSave(game: SolitaireGameId, config: number | undefined): VariantId {
  if (config === undefined) return game as VariantId
  switch (game) {
    case 'klondike':
      return klondikeVariant(config === 3 ? 3 : 1)
    case 'canfield':
      return canfieldVariant(config === 1 ? 1 : 3)
    case 'spider':
      return spiderVariant(config === 2 || config === 4 ? config : 1)
    case 'golf':
      return golfVariant(config === 1)
    case 'tripeaks':
      return tripeaksVariant(config === 1)
    case 'scorpion':
      return scorpionVariant(config === 1)
    case 'fortythieves':
      return fortyThievesVariant(config === 1)
    default:
      return game as VariantId
  }
}
