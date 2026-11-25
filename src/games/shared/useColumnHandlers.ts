import { useLayoutEffect, useMemo, useRef } from 'react'

import { DragFlightHandle } from '@/components/dragdrop/DragGhostLayer'
import { DropZoneRegistry } from '@/components/dragdrop/DropZoneRegistry'
import { PileDragConfig } from '@/components/PileView'
import { PileRef } from '@/engine/gameTypes'
import { Card } from '@/engine/types'

type Measure = () => Promise<{ x: number; y: number }>

export interface ColumnHandlers {
  /** A drop of `count` cards dragged from column `col` onto `to` (PileDragConfig's onDrop, with the column). */
  onDrop: (col: number, to: PileRef, count: number, anchorCardId: string, flight: DragFlightHandle) => Promise<boolean> | boolean
  /** A tap on a card in column `col` (PileView's onPressCard, with the column). */
  onPressCard: (col: number, card: Card, indexFromTop: number, measure: Measure) => void
}

export interface ColumnHandlerOptions {
  /** How many cards move together from a card, from the column's own cards alone (PileDragConfig's getRunCount). Must be
   * stable (a module-level function, or a useCallback whose deps are rules that change per deal): a new one rebuilds
   * every column's config. */
  getRunCount: (indexFromTop: number, cards: Card[], col: number) => number
  grabRunBelow?: boolean
}

/**
 * One drag config and one tap handler per column, built once and kept across renders, calling the screen's latest
 * `handlers`. A screen that builds them inline every render hands every PileView new props on every commit, so its memo
 * never holds and every column re-renders, with every card in it, each time anything on the board changes: on an LG
 * Stylo 6 that was about 0.57 s of React rendering per Klondike move (2026-11-25), the stall that held a tapped card
 * back. FreeCell built its own this way first (its dragConfigs/onPressCardConfigs).
 *
 * The handlers are swapped in after each commit (a layout effect), before anything can call them.
 */
export function useColumnHandlers(columns: number, registry: DropZoneRegistry, { getRunCount, grabRunBelow }: ColumnHandlerOptions, handlers: ColumnHandlers): { drag: PileDragConfig[]; onPressCard: ((card: Card, indexFromTop: number, measure: Measure) => void)[] } {
  const latest = useRef(handlers)
  useLayoutEffect(() => {
    latest.current = handlers
  })
  const drag = useMemo(
    () =>
      Array.from({ length: columns }, (_, col): PileDragConfig => ({
        registry,
        grabRunBelow,
        getRunCount: (indexFromTop, cards) => getRunCount(indexFromTop, cards, col),
        onDrop: (to, count, anchorCardId, flight) => latest.current.onDrop(col, to, count, anchorCardId, flight)
      })),
    [columns, registry, getRunCount, grabRunBelow]
  )
  const onPressCard = useMemo(() => Array.from({ length: columns }, (_, col) => (card: Card, indexFromTop: number, measure: Measure) => latest.current.onPressCard(col, card, indexFromTop, measure)), [columns])
  return { drag, onPressCard }
}
