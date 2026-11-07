import { CARD_ASPECT } from '@tastic/cards'

import { cardLayoutForRow } from '@/components/cardLayout'
import { FACE_UP_OFFSET_RATIO } from '@/components/CardSizeContext'
import { computeGameLayout, GAME_CONTENT_PADDING } from '@/components/gameLayout'
import { cardPosition, PYRAMID_BOARD_MODEL, pyramidCardWidth, pyramidCellScreenPoint, ROWS, triangleHeight } from '@/games/pyramid/geometry'
import { clampCardWidthForHeight } from '@/games/shared/clampCardWidthForHeight'

const CARD_W = 50
const GAP = 6

describe('pyramidCellScreenPoint', () => {
  it('is exactly measured origin + cardPosition', () => {
    const origin = { x: 37.5, y: 412.25 }
    const { left, top } = cardPosition(4, 3, CARD_W, CARD_W / CARD_ASPECT, GAP)
    expect(pyramidCellScreenPoint(origin, 4, 3, CARD_W, GAP)).toEqual({ x: origin.x + left, y: origin.y + top })
  })
})

describe('pyramidCardWidth', () => {
  it('portrait is identical to the original formula wherever that fit, and smaller (fitting) where it ran past the screen', () => {
    for (const w of [320, 375, 390, 402, 430, 600, 768]) {
      for (const h of [568, 667, 812, 874, 932, 1024]) {
        if (w > h) continue
        for (const insets of [
          { top: 0, right: 0, bottom: 0, left: 0 },
          { top: 47, right: 0, bottom: 34, left: 0 },
          { top: 59, right: 0, bottom: 34, left: 0 }
        ]) {
          const layout = computeGameLayout(w, h, insets)
          const { cardWidth: widthCardWidth } = cardLayoutForRow(layout.contentWidth - GAME_CONTENT_PADDING * 2, ROWS)
          // useTableauMaxHeight(widthCardWidth) in portrait, verbatim.
          const topRow = widthCardWidth / CARD_ASPECT
          const portraitAvailable = Math.max(0, layout.availableHeight - topRow - 16 - 20)
          const oldWidth = clampCardWidthForHeight(widthCardWidth, portraitAvailable, ROWS - 1, FACE_UP_OFFSET_RATIO, CARD_ASPECT)
          const boardHeight = (cw: number) => cw / CARD_ASPECT + 20 + triangleHeight(cw) + 20
          const width = pyramidCardWidth(widthCardWidth, layout.isWide, layout.availableHeight, portraitAvailable)
          if (boardHeight(oldWidth) <= layout.availableHeight + 1e-6) expect(width).toBe(oldWidth)
          else expect(width).toBeLessThan(oldWidth)
        }
      }
    }
  })

  it('portrait never runs past the screen: near-square windows, where the clamp binds, used to by up to 4pt (and the board now scrolls past a point)', () => {
    let checked = 0
    for (let w = 360; w <= 720; w += 20) {
      for (let h = w; h <= w + 160; h += 5) {
        const layout = computeGameLayout(w, h, { top: 0, right: 0, bottom: 0, left: 0 })
        if (layout.isWide) continue
        const { cardWidth: widthCardWidth } = cardLayoutForRow(layout.contentWidth - GAME_CONTENT_PADDING * 2, ROWS)
        const portraitAvailable = Math.max(0, layout.availableHeight - widthCardWidth / CARD_ASPECT - 16 - 20)
        const cw = pyramidCardWidth(widthCardWidth, false, layout.availableHeight, portraitAvailable)
        if (cw <= 28) continue // the floor every card size keeps: nothing smaller is tappable
        const boardHeight = cw / CARD_ASPECT + 20 + triangleHeight(cw) + 20
        expect(boardHeight).toBeLessThanOrEqual(layout.availableHeight + 1e-6)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('wide layout makes the real board (control row + triangle + margins) fit the available height', () => {
    const layout = computeGameLayout(874, 402, { top: 0, right: 0, bottom: 21, left: 59 })
    expect(layout.isWide).toBe(true)
    const { cardWidth: widthCardWidth } = cardLayoutForRow(layout.contentWidth - GAME_CONTENT_PADDING * 2, ROWS)
    const cw = pyramidCardWidth(widthCardWidth, true, layout.availableHeight, 0)
    const cardH = cw / CARD_ASPECT
    const boardHeight = cardH + 20 + triangleHeight(cw) + 20
    expect(boardHeight).toBeCloseTo(PYRAMID_BOARD_MODEL.perWidth * cw + PYRAMID_BOARD_MODEL.fixed, 6)
    expect(boardHeight).toBeLessThanOrEqual(layout.availableHeight + 1e-6)
    if (cw < widthCardWidth) expect(boardHeight).toBeCloseTo(layout.availableHeight, 6)
  })
})
