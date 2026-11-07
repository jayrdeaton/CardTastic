import { columnInsets, computeFramePlacement, FRAME_ALIGN_EDGE_MARGIN } from '@/components/useFrameAutoAlign'

describe('FRAME_ALIGN_EDGE_MARGIN', () => {
  it('is @tastic/hud EDGE_MARGIN (12), so a popover keeps the margin it always had', () => {
    expect(FRAME_ALIGN_EDGE_MARGIN).toBe(12)
  })
})

describe('computeFramePlacement', () => {
  // A phone held sideways: an 874x402 window, home-indicator/notch side insets like the simulator reported.
  const FRAME_W = 874
  const FRAME_H = 402
  const INSETS = { top: 0, right: 34, bottom: 0, left: 62 }
  const CONTENT_W = 183
  const CONTENT_H = 200
  const trigger = (x: number, y: number, width = 48, height = 48) => ({ x, y, width, height })
  const place = (t: ReturnType<typeof trigger>, contentW = CONTENT_W, contentH = CONTENT_H, insets = INSETS, frameW = FRAME_W, frameH = FRAME_H) => computeFramePlacement(t, contentW, contentH, frameW, frameH, insets)

  describe('horizontal alignment', () => {
    it('centres a popover on a trigger with room on both sides', () => {
      const result = place(trigger(400, 20))
      expect(result.align).toBe('center')
      expect(result.verticalAlign).toBe('below')
      // frameHeight - insets.bottom - (y + height) - margin
      expect(result.maxHeight).toBe(FRAME_H - INSETS.bottom - (20 + 48) - FRAME_ALIGN_EDGE_MARGIN)
      expect(result.maxHeight).toBe(322)
    })

    it("aligns 'left' when a centred popover would spill past the left bound", () => {
      // centre x = 104, so a 183-wide popover would start at 12.5 - left of the 62 + 12 = 74 bound.
      expect(place(trigger(80, 20)).align).toBe('left')
    })

    it("aligns 'right' when a centred popover would spill past the right bound", () => {
      // centre x = 804 -> right edge 895.5, past 874 - 34 - 12 = 828.
      expect(place(trigger(780, 20)).align).toBe('right')
    })

    it("falls back to 'center' when the popover is wider than the frame has room for on either side", () => {
      // Usable span is 74..828 (754pt); an 800pt popover on a mid-frame trigger overflows both edges.
      const result = place(trigger(413, 20), 800)
      expect(result.align).toBe('center')
    })

    it('a popover that exactly touches the right bound does not overflow (strict comparison)', () => {
      // 180-wide popover centred on x = 738 ends at exactly 828.
      expect(place(trigger(714, 20), 180).align).toBe('center')
      expect(place(trigger(715, 20), 180).align).toBe('right')
    })

    it('a popover that exactly touches the left bound does not overflow (strict comparison)', () => {
      // 180-wide popover centred on x = 164 starts at exactly 74.
      expect(place(trigger(140, 20), 180).align).toBe('center')
      expect(place(trigger(139, 20), 180).align).toBe('left')
    })

    it('honours the LEFT safe-area inset: a popover that fits the raw frame is still pushed off a notch-side inset', () => {
      // centre x = 110 -> starts at 18.5: inside the raw frame's 12pt margin, but inside the 62pt inset.
      const t = trigger(86, 20)
      expect(place(t, CONTENT_W, CONTENT_H, { top: 0, right: 0, bottom: 0, left: 0 }).align).toBe('center')
      expect(place(t).align).toBe('left')
    })

    it('honours the RIGHT safe-area inset: a popover that fits the raw frame is still pushed off a notch-side inset', () => {
      // centre x = 750 -> ends at 841.5: inside the raw frame's 862 bound, but past the 828 inset bound.
      const t = trigger(726, 20)
      expect(place(t, CONTENT_W, CONTENT_H, { top: 0, right: 0, bottom: 0, left: 0 }).align).toBe('center')
      expect(place(t).align).toBe('right')
    })

    it('works in the portrait frame too (a trigger in the top-right corner opens right-aligned)', () => {
      const result = place(trigger(402 - 16 - 48, 60), CONTENT_W, CONTENT_H, { top: 47, right: 0, bottom: 34, left: 0 }, 402, 874)
      expect(result.align).toBe('right')
      expect(result.verticalAlign).toBe('below')
    })
  })

  describe('vertical direction and maxHeight', () => {
    it('maxHeight below is the room between the trigger and the bottom inset, less the margin', () => {
      const insets = { top: 10, right: 34, bottom: 21, left: 62 }
      const result = place(trigger(400, 100), CONTENT_W, CONTENT_H, insets)
      expect(result.verticalAlign).toBe('below')
      expect(result.maxHeight).toBe(FRAME_H - insets.bottom - (100 + 48) - FRAME_ALIGN_EDGE_MARGIN)
    })

    it("flips 'above' for a low trigger with more room above and content taller than the room below", () => {
      // roomBelow = 402 - 378 - 12 = 12, roomAbove = 330 - 12 = 318.
      const result = place(trigger(400, 330))
      expect(result.verticalAlign).toBe('above')
      expect(result.maxHeight).toBe(318)
    })

    it('measures the room above from the top inset', () => {
      const insets = { top: 10, right: 34, bottom: 21, left: 62 }
      // roomBelow = 402 - 21 - 328 - 12 = 41, roomAbove = 280 - 10 - 12 = 258.
      const result = place(trigger(400, 280), CONTENT_W, 100, insets)
      expect(result.verticalAlign).toBe('above')
      expect(result.maxHeight).toBe(258)
    })

    it('never flips when the content fits below, even if there is more room above', () => {
      // roomBelow = 402 - 248 - 12 = 142 (fits a 100pt popover), roomAbove = 200 - 12 = 188.
      const result = place(trigger(400, 200), CONTENT_W, 100)
      expect(result.verticalAlign).toBe('below')
      expect(result.maxHeight).toBe(142)
    })

    it('stays below (capped to the room below) when the content is too tall but there is less room above', () => {
      // roomBelow = 402 - 148 - 12 = 242, roomAbove = 100 - 12 = 88.
      const result = place(trigger(400, 100), CONTENT_W, 300)
      expect(result.verticalAlign).toBe('below')
      expect(result.maxHeight).toBe(242)
    })

    it('stays below on an exact tie between the room above and below (flip needs strictly more room)', () => {
      // roomAbove = 177 - 12 = 165, roomBelow = 402 - 225 - 12 = 165.
      const result = place(trigger(400, 177), CONTENT_W, 300)
      expect(result.verticalAlign).toBe('below')
      expect(result.maxHeight).toBe(165)
    })

    it('never reports a negative maxHeight when the trigger overhangs the frame (flipped above)', () => {
      // roomBelow = 402 - 405 - 12 = -15, roomAbove = 5 - 12 = -7: above wins, clamped to 0.
      const result = place(trigger(400, 5, 48, 400))
      expect(result.verticalAlign).toBe('above')
      expect(result.maxHeight).toBe(0)
    })

    it('never reports a negative maxHeight when the trigger overhangs the frame (staying below)', () => {
      // roomBelow = 402 - 400 - 12 = -10, roomAbove = 0 - 12 = -12: below wins, clamped to 0.
      const result = place(trigger(400, 0, 48, 400))
      expect(result.verticalAlign).toBe('below')
      expect(result.maxHeight).toBe(0)
    })
  })
})

describe('columnInsets', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 }

  it('moves the side bounds in to a capped column in a wide frame', () => {
    expect(columnInsets(none, 1280, 720, 640)).toEqual({ top: 0, right: 320, bottom: 0, left: 320 })
  })

  it('keeps a safe-area inset larger than the column margin', () => {
    expect(columnInsets({ ...none, left: 400 }, 1280, 720, 640)).toEqual({ top: 0, right: 320, bottom: 0, left: 400 })
  })

  it('leaves portrait, an uncapped frame and a frame narrower than the cap alone', () => {
    expect(columnInsets(none, 720, 1280, 640)).toBe(none)
    expect(columnInsets(none, 1280, 720, undefined)).toBe(none)
    expect(columnInsets(none, 600, 400, 640)).toBe(none)
  })

  it('stops a centred popover running past the column (the desktop Profiles roster)', () => {
    // A 64pt swatch 12pt inside the column's left edge, a 180pt-wide popover.
    const trigger = { x: 332, y: 100, width: 64, height: 64 }
    expect(computeFramePlacement(trigger, 180, 200, 1280, 720, none).align).toBe('center')
    expect(computeFramePlacement(trigger, 180, 200, 1280, 720, columnInsets(none, 1280, 720, 640)).align).toBe('left')
  })
})
