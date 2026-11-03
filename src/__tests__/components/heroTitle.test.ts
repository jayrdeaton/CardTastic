import { HERO_FAN_HEIGHT, HERO_FAN_SPAN } from '@/components/heroFan'
import { heroScaleFor } from '@/components/HeroTitle'

// Home's hero in the wide layout's left pane: the shell hands it a box (`fit`, the pane's width and its height above
// seat 1's button), and the fan shrinks to fit it under the title and subtitle, as Solitaire's own Home sized it.

const TALL = 900

describe('heroScaleFor', () => {
  it('keeps the natural size when the pane has room for it', () => {
    expect(heroScaleFor({ width: HERO_FAN_SPAN + 40, height: HERO_FAN_HEIGHT + 200 }, TALL)).toBe(1)
  })

  it('shrinks the fan to the pane width', () => {
    expect(heroScaleFor({ width: HERO_FAN_SPAN * 0.7, height: HERO_FAN_HEIGHT * 3 }, TALL)).toBeCloseTo(0.7)
  })

  it('shrinks it to the height left once the title and subtitle are under it', () => {
    // The title and subtitle take 70pt of the box.
    expect(heroScaleFor({ width: HERO_FAN_SPAN * 2, height: HERO_FAN_HEIGHT * 0.75 + 70 }, TALL)).toBeCloseTo(0.75)
  })

  it('never grows past 0.8 in a short window (a phone held sideways)', () => {
    expect(heroScaleFor({ width: HERO_FAN_SPAN * 2, height: HERO_FAN_HEIGHT * 3 }, 402)).toBe(0.8)
  })

  it('never shrinks below 0.55', () => {
    expect(heroScaleFor({ width: 20, height: 20 }, 320)).toBe(0.55)
  })
})
