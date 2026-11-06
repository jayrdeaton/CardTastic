import { type AnyCard } from '@tastic/cards'
import type { GamePreviewProps } from '@tastic/shell'
import { createElement } from 'react'

import { SlapPreview } from '@/games/ratslap/RatSlapPreview'

const KING_OF_HEARTS: AnyCard = { id: 'preview-hearts-13', suit: 'hearts', rank: 13, faceUp: true }
const SEVEN_OF_SPADES: AnyCard = { id: 'preview-spades-7', suit: 'spades', rank: 7, faceUp: true }

/** War's Home tile: a deck at each end and a battle between them, a King over a 7. */
export function WarPreview(props: GamePreviewProps) {
  return createElement(SlapPreview, { ...props, under: SEVEN_OF_SPADES, top: KING_OF_HEARTS })
}
