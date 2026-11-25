import type { TableColors } from '@tastic/cards'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { bitmapBackSources, BitmapCardBack, MAX_BITMAP_BACK_WIDTH } from '@/components/BitmapCardBack'
import { CardBackArt } from '@/components/CardBackArt'
import { CARD_BACK_BITMAPS } from '@/components/cardBackBitmaps'
import { CardBackWarmup } from '@/components/CardBackWarmup'
import { MonogramCardBack } from '@/components/MonogramCardBack'
import { darkColors, lightColors } from '@/components/palettes'

// On Android the card backs are drawn from pre-rasterized layers (cardBackBitmaps.ts, scripts/generate-card-back-bitmaps.mjs)
// instead of live react-native-svg, which draws in software on the main thread there. A back keeps the player's colors
// (white masks tinted at draw time), and anything the bake doesn't cover keeps the SVG.

let mockBitmap = true
jest.mock('@/components/cardBackPlatform', () => ({
  get BITMAP_CARD_BACKS() {
    return mockBitmap
  }
}))
jest.mock('@tastic/cards', () => {
  const { View: MockView } = require('react-native')
  return {
    ...jest.requireActual('@tastic/cards'),
    CardBack: () => <MockView testID='svg-geometric' />,
    DecoratedCardBack: ({ style }: { style: string }) => <MockView testID={`svg-${style}`} />
  }
})

let mockSettings: { cardBackStyle?: string } = {}
jest.mock('react-native-paper', () => ({ ...jest.requireActual('react-native-paper'), useTheme: () => ({ dark: false }) }))
jest.mock('@/stores/profiles', () => ({ usePlayer: () => ({ color: '#e91e63' }) }))
jest.mock('@/hooks/useSettings', () => {
  const actual = jest.requireActual('@/redux/settingsSlice')
  return { useSettings: () => ({ settings: { ...actual.DEFAULT_SETTINGS, ...mockSettings } }) }
})

const player: TableColors = { ...lightColors, cardBack: '#9D2D53', cardBackPattern: '#D58AA4', cardBackPatternInverted: '#D58AA4' }
const STYLES = ['geometric', 'ornate', 'plain'] as const
/** The frame colors a back is drawn in: no invert in either mode, and Invert Dark Mode Colors in light and in dark mode
 * (PlayingCard hands the setting to the back in both). */
const FRAME_KEYS = ['#FFFFFF|#000000', `${lightColors.cardFaceInverted}|${lightColors.textBlackInverted}`, `${darkColors.cardFaceInverted}|${darkColors.textBlackInverted}`]

beforeEach(() => {
  mockBitmap = true
})

describe('the baked backs', () => {
  it('has every style at a run of widths up to the widest card, in every frame the palettes draw', () => {
    for (const style of STYLES) {
      const widths = CARD_BACK_BITMAPS[style].map((b) => b.width)
      expect(widths).toEqual([...widths].sort((a, b) => a - b))
      expect(widths[0]).toBeLessThanOrEqual(32)
      expect(widths[widths.length - 1]).toBe(96)
      // Each width ~1.2x the last, so the nearest is never more than ~10% off.
      widths.slice(1).forEach((w, i) => expect(w / widths[i]).toBeLessThan(1.25))
      for (const bake of CARD_BACK_BITMAPS[style]) FRAME_KEYS.forEach((key) => expect(bake.frames[key]).toBeDefined())
    }
  })

  it('has its own black only on the Ornate back', () => {
    expect(CARD_BACK_BITMAPS.ornate.every((b) => b.ink)).toBe(true)
    expect(CARD_BACK_BITMAPS.geometric.some((b) => b.ink)).toBe(false)
    expect(CARD_BACK_BITMAPS.plain.some((b) => b.ink)).toBe(false)
  })
})

describe('bitmapBackSources', () => {
  it('picks the nearest width by ratio', () => {
    const at = (w: number) => bitmapBackSources('geometric', player, false, w)?.pattern
    const bake = (w: number) => CARD_BACK_BITMAPS.geometric.find((b) => b.width === w)?.pattern
    expect(at(50)).toBe(bake(46))
    expect(at(64)).toBe(bake(66))
    expect(at(20)).toBe(bake(32))
    expect(at(MAX_BITMAP_BACK_WIDTH)).toBe(bake(96))
  })

  it('takes the frame in the colors the SVG would draw it in', () => {
    const bake = CARD_BACK_BITMAPS.plain.find((b) => b.width === 55)!
    expect(bitmapBackSources('plain', player, false, 55)?.frame).toBe(bake.frames['#FFFFFF|#000000'])
    expect(bitmapBackSources('plain', { ...darkColors }, true, 55)?.frame).toBe(bake.frames[`${darkColors.cardFaceInverted}|${darkColors.textBlackInverted}`])
  })

  it('leaves the SVG to a card wider than any bake, or a frame color the bake lacks', () => {
    expect(bitmapBackSources('geometric', player, false, MAX_BITMAP_BACK_WIDTH + 1)).toBeNull()
    expect(bitmapBackSources('geometric', { ...player, cardFaceInverted: '#123456' }, true, 55)).toBeNull()
  })

  it('hands back the same layers for the same back, so a memoized back stays put', () => {
    expect(bitmapBackSources('ornate', player, false, 50)).toBe(bitmapBackSources('ornate', player, false, 48))
  })
})

type Json = { type: string; props: Record<string, unknown>; children?: (Json | string)[] | null }
function hosts(type: string, node = screen.toJSON() as Json | Json[] | null, out: Json[] = []): Json[] {
  if (!node) return out
  if (Array.isArray(node)) {
    node.forEach((child) => hosts(type, child, out))
    return out
  }
  if (node.type === type) out.push(node)
  ;(node.children ?? []).forEach((child) => typeof child !== 'string' && hosts(type, child, out))
  return out
}
const styleOf = (node: Json) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown> & { fontSize: number; top: number }
const layerStyles = () => hosts('Image').map(styleOf)

describe('BitmapCardBack', () => {
  it("stacks the frame, then the body and pattern tinted to the player's colors", async () => {
    await render(<BitmapCardBack sources={bitmapBackSources('geometric', player, false, 50)!} colors={player} width={50} height={73} />)
    expect(layerStyles().map((s) => s.tintColor)).toEqual([undefined, player.cardBack, player.cardBackPattern])
  })

  it('tints the pattern its inverted color under Invert Dark Mode Colors, and draws the Ornate black on top', async () => {
    const colors = { ...player, cardBackPatternInverted: '#ABCDEF' }
    await render(<BitmapCardBack sources={bitmapBackSources('ornate', colors, true, 50)!} colors={colors} width={50} height={73} invertDarkModeColors />)
    expect(layerStyles().map((s) => s.tintColor)).toEqual([undefined, colors.cardBack, '#ABCDEF', '#000000'])
  })
})

describe('CardBackArt', () => {
  const size = { colors: player, width: 50, height: 73 }

  it('draws every style from bitmaps where card art is bitmaps', async () => {
    for (const backStyle of STYLES) {
      await render(<CardBackArt backStyle={backStyle} {...size} />)
      expect(hosts('Image').length).toBeGreaterThanOrEqual(3)
      expect(screen.queryByTestId(`svg-${backStyle}`)).toBeNull()
      await screen.unmount()
    }
  })

  it('keeps the SVG elsewhere, and for a card wider than any bake', async () => {
    mockBitmap = false
    await render(<CardBackArt backStyle='ornate' {...size} />)
    expect(screen.getByTestId('svg-ornate')).toBeTruthy()
    await screen.unmount()

    mockBitmap = true
    await render(<CardBackArt backStyle='geometric' {...size} width={MAX_BITMAP_BACK_WIDTH + 10} />)
    expect(screen.getByTestId('svg-geometric')).toBeTruthy()
  })
})

describe('CardBackWarmup', () => {
  // An Android Image whose bitmap nothing has decoded yet draws a frame or two late: a game's stock opened plain on the phone.
  beforeEach(() => {
    mockSettings = {}
  })

  it("keeps every baked width of the player's back style mounted, invisibly", async () => {
    await render(<CardBackWarmup />)
    expect(hosts('Image')).toHaveLength(CARD_BACK_BITMAPS.geometric.length * 3)
    expect(hosts('Image').map((image) => image.props.source)).toContain(CARD_BACK_BITMAPS.geometric[0].body)
  })

  it('warms the Plain back for the Monogram, with the Ornate black when that is the style', async () => {
    mockSettings = { cardBackStyle: 'monogram' }
    await render(<CardBackWarmup />)
    expect(hosts('Image').map((image) => image.props.source)).toContain(CARD_BACK_BITMAPS.plain[3].pattern)
    await screen.unmount()

    mockSettings = { cardBackStyle: 'ornate' }
    await render(<CardBackWarmup />)
    expect(hosts('Image')).toHaveLength(CARD_BACK_BITMAPS.ornate.length * 4)
  })

  it('draws nothing where card art is SVG', async () => {
    mockBitmap = false
    await render(<CardBackWarmup />)
    expect(screen.toJSON()).toBeNull()
  })
})

describe('MonogramCardBack from bitmaps', () => {
  const textStyle = () => styleOf(hosts('Text')[0])

  it('lays native text in the card font over the Plain back, on the SVG text baseline', async () => {
    await render(<MonogramCardBack colors={player} width={50} height={73} monogram='jd' />)
    expect(screen.getByText('JD')).toBeTruthy()
    expect(screen.queryByTestId('svg-plain')).toBeNull()
    const style = textStyle()
    expect(style.fontFamily).toBe('DejaVu Serif')
    expect(style.textAlign).toBe('center')
    // The cap height straddles the middle: baseline = height/2 + capHeight/2, and the text's top is one ascent above it.
    expect(style.top + style.fontSize * (1923 / 2048)).toBeCloseTo(73 / 2 + (style.fontSize * 0.729) / 2)
    expect(hosts('Text')[0].props.allowFontScaling).toBe(false)
  })

  it('draws an emoji in its own colors, a little see-through', async () => {
    await render(<MonogramCardBack colors={player} width={50} height={73} monogram='🦊' />)
    expect(screen.getByText('🦊')).toBeTruthy()
    expect(textStyle().opacity).toBe(0.6)
    expect(textStyle().color).toBeUndefined()
  })
})
