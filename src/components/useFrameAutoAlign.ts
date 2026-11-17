import type { AlignResult, PopoverAlign, PopoverVerticalAlign } from '@tastic/hud/chrome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { type LayoutInsets } from './gameLayout'

// Minimum breathing room between a popover's outer edge and the window's usable edge - @tastic/hud's own
// EDGE_MARGIN, so a popover keeps the same margin it had before.
export const FRAME_ALIGN_EDGE_MARGIN = 12

export interface FrameRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FramePlacement {
  align: PopoverAlign
  verticalAlign: PopoverVerticalAlign
  maxHeight: number
}

/** Where a `contentWidth` x `contentHeight` popover should open from `trigger`, in window coordinates - the same
 * decision @tastic/hud's useAutoAlign makes (centred if it fits, else flush to whichever edge has room; below unless
 * there is genuinely more room above), but measured against the window's safe-area insets as well as its edges, so a
 * popover keeps off the notch/island side of a phone held sideways, which useAutoAlign doesn't know about. */
export function computeFramePlacement(trigger: FrameRect, contentWidth: number, contentHeight: number, frameWidth: number, frameHeight: number, insets: LayoutInsets): FramePlacement {
  const leftBound = insets.left + FRAME_ALIGN_EDGE_MARGIN
  const rightBound = frameWidth - insets.right - FRAME_ALIGN_EDGE_MARGIN
  const centerX = trigger.x + trigger.width / 2
  const overflowsRight = centerX + contentWidth / 2 > rightBound
  const overflowsLeft = centerX - contentWidth / 2 < leftBound
  // Both overflowing means the popover is wider than the frame has room for either way - centred is the
  // least-bad choice there (symmetric clipping beats asymmetric).
  const align: PopoverAlign = overflowsRight && !overflowsLeft ? 'right' : overflowsLeft && !overflowsRight ? 'left' : 'center'

  const roomBelow = frameHeight - insets.bottom - (trigger.y + trigger.height) - FRAME_ALIGN_EDGE_MARGIN
  const roomAbove = trigger.y - insets.top - FRAME_ALIGN_EDGE_MARGIN
  // Below is preferred - flips only when there is genuinely more room the other way.
  const above = contentHeight > roomBelow && roomAbove > roomBelow
  return { align, verticalAlign: above ? 'above' : 'below', maxHeight: Math.max(above ? roomAbove : roomBelow, 0) }
}

/** The safe-area insets widened to the edges of a centred content column capped at `maxContentWidth`, which
 * hud's ScreenFrame applies only while the window is wider than tall. A popover inside a scroll view in that
 * column is clipped at the column's edges (the scroll view, and on web FadingScrollView's mask), so it has to
 * be placed against them rather than the frame's (the Profiles roster on a desktop window). */
export function columnInsets(insets: LayoutInsets, frameWidth: number, frameHeight: number, maxContentWidth: number | undefined): LayoutInsets {
  if (maxContentWidth === undefined || frameWidth <= frameHeight || frameWidth <= maxContentWidth) return insets
  const side = (frameWidth - maxContentWidth) / 2
  return { ...insets, left: Math.max(insets.left, side), right: Math.max(insets.right, side) }
}

/** Drop-in for useAutoAlign that also keeps off the safe-area insets and inside a capped content column (the pack's
 * `usePickerAlign`: Home's player menu, the setup screen's and stats screen's pickers, the Profiles swatch). Same result
 * shape, so it goes straight into a hud component's `alignOverride`.
 *
 * Re-measures whenever `open` flips true, and again if the window changes under an open popover (the phone turned, a
 * resize) - `measured` only resets on a genuine (re)open, via the render-phase edge check, so an already-open popover
 * never flickers hidden just because the window changed. */
export function useFrameAutoAlign(open: boolean, contentWidth: number, contentHeight: number, options?: { maxContentWidth?: number }): AlignResult {
  const maxContentWidth = options?.maxContentWidth
  const triggerRef = useRef<View>(null)
  const { width: frameWidth, height: frameHeight } = useWindowDimensions()
  const { top, right, bottom, left } = useSafeAreaInsets()
  const [placement, setPlacement] = useState<FramePlacement>({ align: 'center', verticalAlign: 'below', maxHeight: contentHeight })
  // False from the instant `open` goes true until this open's own measurement lands (measureInWindow is a
  // native callback), so the caller can hold the popover hidden instead of painting it at a stale guess.
  const [measured, setMeasured] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMeasured(false)
  }

  const measure = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPlacement(computeFramePlacement({ x, y, width, height }, contentWidth, contentHeight, frameWidth, frameHeight, columnInsets({ top, right, bottom, left }, frameWidth, frameHeight, maxContentWidth)))
      setMeasured(true)
    })
  }, [contentWidth, contentHeight, frameWidth, frameHeight, top, right, bottom, left, maxContentWidth])

  useEffect(() => {
    if (open) measure()
  }, [open, measure])

  return { ...placement, measured, triggerRef }
}
