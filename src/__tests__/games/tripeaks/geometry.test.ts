import { CARD_ASPECT } from '@tastic/cards'

import { FACE_UP_OFFSET_RATIO } from '@/components/CardSizeContext'
import { computeGameLayout, fitCardWidthToHeight } from '@/components/gameLayout'
import { clampCardWidthForHeight } from '@/games/shared/clampCardWidthForHeight'
import { boardHeight, buildCardPositions, CONTROL_ROW_MARGIN_BOTTOM, peaksCardScreenPoint, TRIPEAKS_BOARD_MODEL, tripeaksCardWidth } from '@/games/tripeaks/geometry'

const CARD_W = 60
const CARD_H = CARD_W / CARD_ASPECT
const GAP = 6

describe('peaksCardScreenPoint', () => {
  const positions = buildCardPositions(CARD_W, CARD_H, GAP)

  it('is exactly measured origin + local offset', () => {
    positions.forEach(({ left, top }) => {
      expect(peaksCardScreenPoint({ x: 13.5, y: 201.25 }, left, top)).toEqual({ x: 13.5 + left, y: 201.25 + top })
    })
  })
})

describe('tripeaksCardWidth', () => {
  it('is the original clamp, unchanged, in portrait', () => {
    for (const [w, h, top, bottom] of [
      [402, 874, 59, 34],
      [375, 667, 20, 0],
      [430, 932, 59, 34],
      [320, 568, 20, 0],
      [768, 1024, 24, 20]
    ]) {
      const layout = computeGameLayout(w, h, { top, right: 0, bottom, left: 0 })
      expect(layout.isWide).toBe(false)
      const widthCardWidth = Math.min(96, (layout.contentWidth - 12) / 10)
      // The old TriPeaksScreen computation, inlined: useTableauMaxHeight(widthCardWidth) then clamp.
      const oldAvailable = Math.max(0, layout.availableHeight - widthCardWidth / CARD_ASPECT - 16 - 20)
      const old = clampCardWidthForHeight(widthCardWidth, oldAvailable, 3, FACE_UP_OFFSET_RATIO, CARD_ASPECT)
      expect(tripeaksCardWidth(widthCardWidth, layout.isWide, layout.availableHeight, oldAvailable)).toBe(old)
    }
  })

  it('fits the real board (stock row + peaks) into the wide layout height', () => {
    const layout = computeGameLayout(874, 402, { top: 0, right: 0, bottom: 21, left: 59 })
    expect(layout.isWide).toBe(true)
    const cw = tripeaksCardWidth(96, true, layout.availableHeight, 0)
    const ch = cw / CARD_ASPECT
    const total = ch + CONTROL_ROW_MARGIN_BOTTOM + boardHeight(ch)
    expect(total).toBeCloseTo(layout.availableHeight, 6)
    expect(cw).toBe(fitCardWidthToHeight(96, layout.availableHeight, TRIPEAKS_BOARD_MODEL))
  })

  it('never exceeds the width-derived card width', () => {
    const layout = computeGameLayout(1200, 2000, { top: 0, right: 0, bottom: 0, left: 0 })
    expect(tripeaksCardWidth(40, true, 5000, 0)).toBe(40)
    expect(layout.isWide).toBe(false)
  })
})
