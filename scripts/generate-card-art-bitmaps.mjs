// Regenerates assets/cardBacks/*.png, assets/pips/*.png and src/components/cardArtBitmaps.ts: the card backs and the
// win's firework pips, pre-rasterized for Android (cardArtPlatform.ts says where they're drawn).
//
//   node scripts/generate-card-art-bitmaps.mjs
//
// Why: react-native-svg draws every SVG on Android in software, on the main thread, into a bitmap of its own, the first
// time each one is shown, and every element is a native view to mount (a Geometric back ~10, an Ornate back over 1,200).
// On a budget phone that was ~0.26 s of a Klondike deal's main thread (CLAUDE.md, "Android performance on the LG Stylo 6").
// A bitmap is drawn by the GPU.
//
// A back is recolored to each player's color, so it can't be one baked picture. It is layers, each the REAL
// component rendered (cardRaster.mjs) with colors picked to separate it:
// - the frame (the card's white edge and outline), in full color, once per frame palette;
// - the body, white where the back's body is (CardBack/DecoratedCardBack drawn with both of its colors white and the
//   frame transparent), drawn tinted to the player's card back;
// - the pattern, white as strongly as the pattern covers the body (the body drawn black and the pattern white: every
//   pixel of a back's body is a mix of its two colors, and the white share is the pattern's), drawn tinted to the
//   pattern color;
// - the Ornate back's border scrollwork, which its art draws in its own black (no fill given), as a fourth, black layer
//   on top.
// Stacked, they are the back in any colors (checked below against a direct render, to the pixel bar the edge pixels
// allow). Each style is drawn at several card widths, picked by the nearest at runtime, so the Geometric back's 1pt
// lines stay 1pt and no bitmap is shrunk far enough to shimmer.
//
// The pips' colors never change with the player (each suit's card ink, ringed in the card's face color), so each is one
// full-color picture, keyed by those colors.
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import UPNG from 'upng-js'

import { bundle, capture, makeWorkDir, ROOT, writeFormatted, writePage } from './cardRaster.mjs'

const WORK_DIR = makeWorkDir('.card-art-')
const BACK_DIR = path.join(ROOT, 'assets', 'cardBacks')
const PIP_DIR = path.join(ROOT, 'assets', 'pips')
const INDEX_FILE = path.join(ROOT, 'src', 'components', 'cardArtBitmaps.ts')

const BACK_STYLES = ['geometric', 'ornate', 'plain']
// Card widths in points, each ~1.2x the last: drawn at the nearest, a Geometric back's 1pt lines are within ~10% of
// 1pt, and a bitmap is never shrunk more than ~1.3x on a 2.6x phone (bilinear filtering shimmers past ~2x). 96 is
// CARD_WIDTH_MAX; a card drawn much wider keeps its SVG (cardArtBitmaps' users check MAX_BITMAP_BACK_WIDTH).
const BACK_WIDTHS = [32, 38, 46, 55, 66, 80, 96]
const BACK_SCALE = 3
const CARD_ASPECT_H = 93 / 64
const PIP_SCALE = 4
// The frame palettes a back is drawn with: PlayingCard passes Invert Dark Mode Colors to the back in either mode.
const FRAMES = { normal: { palette: 'lightColors', invert: false }, lightInvert: { palette: 'lightColors', invert: true }, darkInvert: { palette: 'darkColors', invert: true } }
const PIP_LOOKS = { normal: { palette: 'lightColors', invert: false }, invert: { palette: 'darkColors', invert: true } }
const PIP_DECKS = ['standard', 'tarot']
// Two players' colors (light and dark mode), to check the stacked layers against a direct render.
const CHECK_COLORS = [
  { cardBack: '#9D2D53', cardBackPattern: '#D58AA4' },
  { cardBack: '#2B4A7A', cardBackPattern: '#8FA6CF' }
]

const React = createRequire(import.meta.url)('react')
const mod = bundle(
  WORK_DIR,
  `import { CardBack, cardFaceColor, DecoratedCardBack, SuitPip, SUITS, suitInk } from '@tastic/cards'
import { AppRegistry, View } from 'react-native'
import { darkColors, lightColors } from '${path.join(ROOT, 'src', 'components', 'palettes')}'
export * from '${path.join(ROOT, 'src', 'components', 'winning', 'pipGeometry')}'
export { AppRegistry, CardBack, cardFaceColor, darkColors, DecoratedCardBack, lightColors, SuitPip, SUITS, suitInk, View }
`
)

function backElement(style, colors, invert, w, h) {
  const props = { colors, width: w, height: h, invertDarkModeColors: invert }
  return style === 'geometric' ? React.createElement(mod.CardBack, props) : React.createElement(mod.DecoratedCardBack, { ...props, style })
}

function backPasses() {
  const t = 'transparent'
  const passes = Object.entries(FRAMES).map(([variant, { palette, invert }]) => {
    const colors = { ...mod[palette], cardBack: t, cardBackPattern: t, cardBackPatternInverted: t }
    const key = invert ? `${colors.cardFaceInverted}|${colors.textBlackInverted}` : '#FFFFFF|#000000'
    return { kind: 'frame', variant, key, colors, invert }
  })
  const masked = (cardBack) => ({ ...mod.lightColors, cardBack, cardBackPattern: '#FFFFFF', cardBackPatternInverted: '#FFFFFF', cardFaceInverted: t, textBlackInverted: t })
  passes.push({ kind: 'body', colors: masked('#FFFFFF'), invert: true })
  passes.push({ kind: 'tone', colors: masked('#000000'), invert: true })
  CHECK_COLORS.forEach((check, i) => passes.push({ kind: 'check', index: i, colors: { ...mod.lightColors, ...check, cardBackPatternInverted: check.cardBackPattern }, invert: false }))
  return passes
}

function buildPages() {
  const pages = []
  const passes = backPasses()
  for (const w of BACK_WIDTHS) {
    const h = w * CARD_ASPECT_H
    const captureH = Math.ceil(h * BACK_SCALE) / BACK_SCALE
    const strideX = Math.ceil(w) + 4
    const strideY = Math.ceil(h) + 4
    const cells = []
    BACK_STYLES.forEach((style, row) => passes.forEach((pass, col) => cells.push({ style, pass, x: col * strideX, y: row * strideY })))
    const element = React.createElement(
      'div',
      null,
      cells.map(({ style, pass, x, y }, i) => React.createElement('div', { key: i, style: { position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex' } }, backElement(style, pass.colors, pass.invert, w, h)))
    )
    const page = writePage(mod, WORK_DIR, `backs-${w}`, element, passes.length * strideX, BACK_STYLES.length * strideY)
    pages.push({ ...page, scale: BACK_SCALE, shots: cells.map(({ style, pass, x, y }) => ({ kind: 'back', style, width: w, pass, clip: { x, y, width: w, height: captureH } })) })
  }

  const pipCells = []
  PIP_DECKS.forEach((deck) =>
    Object.values(PIP_LOOKS).forEach(({ palette, invert }) =>
      mod.SUITS.forEach((suit) => {
        const colors = mod[palette]
        const ink = mod.suitInk(suit, colors, { cardStyle: deck === 'tarot' ? 'tarot' : 'compact', invertDarkModeColors: invert })
        const outline = mod.cardFaceColor(colors, invert)
        pipCells.push({ deck, suit, ink, outline })
      })
    )
  )
  const pipStride = mod.PIP_BOX + 4
  const pipElement = React.createElement(
    'div',
    null,
    pipCells.map(({ deck, suit, ink, outline }, i) =>
      // The pip's own box as PipFireworks lays it out (styles.pip: the glyph centred in PIP_BOX), so the picture fills the same box.
      React.createElement(mod.View, { key: i, style: { position: 'absolute', left: i * pipStride, top: 0, width: mod.PIP_BOX, height: mod.PIP_BOX, alignItems: 'center', justifyContent: 'center' } }, React.createElement(mod.SuitPip, { suit, color: ink, size: mod.PIP_SIZE, theme: deck, outline: { color: outline, width: mod.PIP_OUTLINE_WIDTH } }))
    )
  )
  const pipPage = writePage(mod, WORK_DIR, 'pips', pipElement, pipCells.length * pipStride, pipStride)
  pages.push({ ...pipPage, scale: PIP_SCALE, shots: pipCells.map((cell, i) => ({ kind: 'pip', ...cell, clip: { x: i * pipStride, y: 0, width: mod.PIP_BOX, height: mod.PIP_BOX } })) })
  return pages
}

function decode(png) {
  const decoded = UPNG.decode(png)
  return { width: decoded.width, height: decoded.height, rgba: new Uint8Array(UPNG.toRGBA8(decoded)[0]) }
}

/** A white picture whose alpha is `alphaAt(i)` for each pixel. */
function whiteMask(width, height, alphaAt) {
  const rgba = new Uint8Array(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    rgba[p * 4] = rgba[p * 4 + 1] = rgba[p * 4 + 2] = 255
    rgba[p * 4 + 3] = alphaAt(p)
  }
  return { width, height, rgba }
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** `src` over `dst` (straight alpha), optionally tinted: every pixel of `src` in `tint`, keeping its alpha (an Image's tintColor). */
function over(dst, src, tint) {
  const t = tint && hex(tint)
  for (let p = 0; p < dst.length; p += 4) {
    const sa = src[p + 3] / 255
    if (sa === 0) continue
    const da = dst[p + 3] / 255
    const oa = sa + da * (1 - sa)
    for (let c = 0; c < 3; c++) {
      const sc = t ? t[c] : src[p + c]
      dst[p + c] = Math.round((sc * sa + dst[p + c] * da * (1 - sa)) / oa)
    }
    dst[p + 3] = Math.round(oa * 255)
  }
}

/** How far the stacked layers land from a direct render in the same colors, in premultiplied 0-255 units: the mean over
 * every channel of every pixel, and the share of pixels off by more than 16 (antialiased body edges, where the body and
 * the frame both cover part of one pixel). */
function layerError(reference, frame, body, pattern, ink, colors) {
  const out = Uint8Array.from(frame)
  over(out, body, colors.cardBack)
  over(out, pattern, colors.cardBackPattern)
  if (ink) over(out, ink, '#000000')
  let sum = 0
  let off = 0
  for (let p = 0; p < out.length; p += 4) {
    let worst = 0
    for (let c = 0; c < 4; c++) {
      const a = c === 3 ? out[p + 3] : (out[p + c] * out[p + 3]) / 255
      const b = c === 3 ? reference[p + 3] : (reference[p + c] * reference[p + 3]) / 255
      const d = Math.abs(a - b)
      sum += d
      worst = Math.max(worst, d)
    }
    if (worst > 16) off++
  }
  return { mean: sum / out.length, offShare: off / (out.length / 4) }
}

/** Writes each picture once (deduplicated on its pixels) as a palette PNG: a mask has at most 256 alphas, so it is
 * exact; the frames and pips are within a fraction of a level. Returns each picture's file name. */
function writePngs(dir, pictures, nameFor) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const byHash = new Map()
  let bytes = 0
  const names = pictures.map((pic) => {
    const hash = crypto.createHash('sha1').update(pic.rgba).digest('hex')
    let name = byHash.get(hash)
    if (!name) {
      name = nameFor(pic)
      byHash.set(hash, name)
      const png = Buffer.from(UPNG.encode([pic.rgba.buffer], pic.width, pic.height, 256))
      fs.writeFileSync(path.join(dir, name), png)
      bytes += png.length
    }
    return name
  })
  return { names, files: byHash.size, bytes }
}

function write(shots) {
  // Backs: per style and width, the frames and the body, pattern and ink masks.
  const backPictures = []
  const layers = {}
  let worst = { mean: 0, offShare: 0 }
  for (const style of BACK_STYLES) {
    for (const w of BACK_WIDTHS) {
      const mine = shots.filter((s) => s.kind === 'back' && s.style === style && s.width === w)
      const pic = (kind, extra = () => true) => decode(mine.find((s) => s.pass.kind === kind && extra(s)).png)
      const body = pic('body')
      const tone = pic('tone')
      // c: how much of the pixel the back covers (the body pass's alpha). k: how much of that is the art's own black (the
      // body pass draws both colors white, so whatever isn't white is black). t: how much of the rest is the pattern (the
      // tone pass draws the body black, so its white is the pattern's, under whatever black is drawn over it).
      const coverage = (p) => body.rgba[p * 4 + 3] / 255
      const black = (p) => 1 - body.rgba[p * 4] / 255
      const patternShare = (p) => (black(p) > 0.999 ? 0 : Math.min(1, tone.rgba[p * 4] / 255 / (1 - black(p))))
      const bodyMask = whiteMask(body.width, body.height, (p) => Math.round(255 * coverage(p)))
      const patternMask = whiteMask(tone.width, tone.height, (p) => Math.round(255 * coverage(p) * patternShare(p)))
      const inkMask = whiteMask(body.width, body.height, (p) => Math.round(255 * coverage(p) * black(p)))
      const ink = inkMask.rgba.some((v, i) => i % 4 === 3 && v > 0) ? inkMask : null
      const frames = Object.keys(FRAMES).map((variant) => ({ variant, key: mine.find((s) => s.pass.variant === variant).pass.key, picture: pic('frame', (s) => s.pass.variant === variant) }))
      for (const [i, colors] of CHECK_COLORS.entries()) {
        const error = layerError(pic('check', (s) => s.pass.index === i).rgba, frames.find((f) => f.variant === 'normal').picture.rgba, bodyMask.rgba, patternMask.rgba, ink?.rgba, colors)
        if (error.mean > worst.mean) worst = { ...error, style, w }
        if (error.mean > 0.5 || error.offShare > 0.001) throw new Error(`${style} at ${w}pt: stacked layers are off from a direct render (mean ${error.mean.toFixed(3)}, ${(error.offShare * 100).toFixed(2)}% of pixels)`)
      }
      const entry = { width: w, frames: {}, body: backPictures.length, pattern: backPictures.length + 1, ink: ink ? backPictures.length + 2 : null }
      backPictures.push({ ...bodyMask, name: `${style}-${w}-body.png` }, { ...patternMask, name: `${style}-${w}-pattern.png` })
      if (ink) backPictures.push({ ...ink, name: `${style}-${w}-ink.png` })
      frames.forEach(({ variant, key, picture }) => {
        entry.frames[key] = backPictures.length
        backPictures.push({ ...picture, name: `${style}-${w}-frame-${variant}.png` })
      })
      ;(layers[style] ??= []).push(entry)
    }
  }
  const backs = writePngs(BACK_DIR, backPictures, (pic) => pic.name)
  const backRef = (i) => `require('../../assets/cardBacks/${backs.names[i]}')`

  const pipShots = shots.filter((s) => s.kind === 'pip')
  const pips = writePngs(
    PIP_DIR,
    pipShots.map((s) => ({ ...decode(s.png), s })),
    ({ s }) => `${s.deck}-${s.suit}-${s.ink.slice(1)}-${s.outline.slice(1)}.png`.toLowerCase()
  )
  const pipRefs = {}
  pipShots.forEach((s, i) => {
    ;((pipRefs[s.deck] ??= {})[s.suit] ??= {})[`${s.ink}|${s.outline}`] = pips.names[i]
  })

  const backLines = BACK_STYLES.map((style) => `  ${style}: [\n${layers[style].map((e) => `    { width: ${e.width}, body: ${backRef(e.body)}, pattern: ${backRef(e.pattern)}, ${e.ink === null ? '' : `ink: ${backRef(e.ink)}, `}frames: { ${Object.entries(e.frames).map(([key, i]) => `'${key}': ${backRef(i)}`).join(', ')} } }`).join(',\n')}\n  ]`)
  const pipLines = PIP_DECKS.map((deck) => `  ${deck}: { ${mod.SUITS.map((suit) => `${suit}: { ${Object.entries(pipRefs[deck][suit]).map(([key, name]) => `'${key}': require('../../assets/pips/${name}')`).join(', ')} }`).join(', ')} }`)
  writeFormatted(
    INDEX_FILE,
    `// GENERATED by scripts/generate-card-art-bitmaps.mjs - do not edit by hand.
import type { Suit } from '@tastic/cards'
import type { ImageSourcePropType } from 'react-native'

export type BitmapBackStyle = ${BACK_STYLES.map((s) => `'${s}'`).join(' | ')}

/** One back style drawn at one card width (points), as layers at ${BACK_SCALE}x: see the generator's header. */
export interface CardBackLayers {
  width: number
  /** The card's edge in full color, keyed by \`\${fill}|\${outline}\` (the colors a back's frame is drawn in). */
  frames: Record<string, ImageSourcePropType>
  /** White where the back's body is: drawn tinted to colors.cardBack. */
  body: ImageSourcePropType
  /** White as strongly as the pattern covers the body: drawn tinted to the pattern color. */
  pattern: ImageSourcePropType
  /** White where the art draws its own black (the Ornate back's border scrollwork): drawn tinted black, over the rest. */
  ink?: ImageSourcePropType
}

/** Every back style's layers, narrowest first. */
export const CARD_BACK_BITMAPS: Record<BitmapBackStyle, CardBackLayers[]> = {
${backLines.join(',\n')}
}

/** Each firework pip in full color at ${PIP_SCALE}x, filling its PIP_BOX: [deck][suit][\`\${ink}|\${outline}\`]. */
export const PIP_BITMAPS: Record<'standard' | 'tarot', Record<Suit, Record<string, ImageSourcePropType>>> = {
${pipLines.join(',\n')}
}
`
  )
  return { backs, pips, worst }
}

try {
  const shots = await capture(WORK_DIR, buildPages())
  const { backs, pips, worst } = write(shots)
  const kb = (bytes) => `${Math.round(bytes / 1024)}KB`
  console.log(`wrote ${backs.files} back layers (${kb(backs.bytes)}) to ${path.relative(ROOT, BACK_DIR)}; stacked vs direct, worst mean ${worst.mean.toFixed(3)}/255 with ${(worst.offShare * 100).toFixed(2)}% of pixels off by more than 16 (${worst.style} at ${worst.w}pt)`)
  console.log(`wrote ${pips.files} pips (${kb(pips.bytes)}) to ${path.relative(ROOT, PIP_DIR)}`)
} finally {
  fs.rmSync(WORK_DIR, { recursive: true, force: true })
}
