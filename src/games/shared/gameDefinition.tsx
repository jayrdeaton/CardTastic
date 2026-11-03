import type { GamePreviewProps, GameRulesProps, GuidelessGameDefinition } from '@tastic/shell'
import type { ComponentType } from 'react'

import { GamePreview, type PreviewCardPlacement } from '@/components/GamePreview'
import type { PreviewGame } from '@/components/previewFaceBitmaps'
import { RulesDialog } from '@/components/RulesDialog'
import { useTableColors } from '@/components/theme'

/** One game as @tastic/shell's pack holds it (games/<id>/definition.ts): no seats, no loadout, no How to Play of its
 * own (the pack's three cards teach every game). */
export type SolitaireGameDefinition = GuidelessGameDefinition

/** A game's Home preview (the shell's `Preview`): its starting deal, laid out once here (every game's preview deal is
 * fixed by its own seed), drawn on the felt in the box Home gives it. Home holds every preview back a frame after it
 * first paints, so drawing it never stalls a navigation. */
export function gamePreview(game: PreviewGame, build: () => PreviewCardPlacement[]): ComponentType<GamePreviewProps> {
  const placements = build()
  return function Preview({ width, height }: GamePreviewProps) {
    const colors = useTableColors()
    return <GamePreview game={game} placements={placements} colors={colors} style={{ width, height, backgroundColor: colors.tableFelt }} />
  }
}

/** A game's rules sheet, opened from its Home tile's info button (the shell's `Rules`). Home's sheet has no deal, so no
 * par: a game's own Rules button (GameChrome) gives its variant's. */
export function gameRules(title: string, rules: string[]): ComponentType<GameRulesProps> {
  return function Rules({ visible, onDismiss }: GameRulesProps) {
    return <RulesDialog visible={visible} onDismiss={onDismiss} title={title} rules={rules} />
  }
}
