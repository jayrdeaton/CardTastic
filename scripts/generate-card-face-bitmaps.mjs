// Regenerates assets/cardFaces/*.png and src/components/cardFaceBitmaps.ts: every face-up card, as
// PlayingCard draws it, pre-rasterized - 4 card styles (compact/numeric/tarot/decorated) x 2 ink
// variants (normal, and dark mode's invertDarkModeColors) x 52 cards.
//
//   node scripts/generate-card-face-bitmaps.mjs
//
// Why: a live CardFace is ~14-17 native views (a court card's vector figure alone was ~100), and the
// board's mount cost is dominated by view count, not JS logic (see CLAUDE.md's performance notes). A
// bitmap face is ONE Image.
//
// Pixel-derived from the REAL component, never a lookalike (cardRaster.mjs: esbuild, react-native-web and
// headless Chrome, which needs Google Chrome installed): each card at 288px wide (CARD_WIDTH_MAX, 96pt, at 3x -
// the largest a card is ever drawn). The colours are this app's own palettes (theme.ts's lightColors/darkColors),
// which is why this lives in the app and not in @tastic/cards: the faces bake in Solitaire's inks.
//
// Identical images (the compact and numeric styles share their court cards) are written once and
// referenced twice.
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import UPNG from 'upng-js'

import { bundle, capture, makeWorkDir, ROOT, writeFormatted, writePage } from './cardRaster.mjs'

const OUT_DIR = path.join(ROOT, 'assets', 'cardFaces')
const INDEX_FILE = path.join(ROOT, 'src', 'components', 'cardFaceBitmaps.ts')
const PREVIEW_OUT_DIR = path.join(ROOT, 'assets', 'previewFaces')
const PREVIEW_INDEX_FILE = path.join(ROOT, 'src', 'components', 'previewFaceBitmaps.ts')
const WORK_DIR = makeWorkDir('.card-faces-')

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const STYLES = ['compact', 'numeric', 'tarot', 'decorated']
// 'normal' is the ink every appearance mode draws when invertDarkModeColors is off (the card inks are
// the same in both palettes - see theme.ts's CARD_INK_*); 'invert' is dark mode with it on. Light mode
// with it on is meant to be a no-op (lightColors' *Inverted tokens mirror the plain ones), so it uses
// 'normal' - see cardFaceBitmaps' own doc.
const VARIANTS = { normal: { palette: 'lightColors', invert: false }, invert: { palette: 'darkColors', invert: true } }

// 288px wide: CARD_WIDTH_MAX (96pt, cardLayout.ts) at 3x - a phone can get there (Aces Up's 4 columns
// on a large phone are ~90pt). Laid out directly in device pixels (a 288-wide card at 1 pixel per CSS
// px), NOT as a 96pt card at 3x: Chrome snaps a fractional border to whole CSS pixels, which turned the
// frame's 0.02W border (1.92pt) into 1pt - a third thinner than the phone draws it. The height is
// fractional (418.5), so the capture takes the next whole pixel; an Image stretched to the card's box
// is off by 0.1% vertically, well under a pixel.
const CARD_W = 288
const CARD_H = (CARD_W * 93) / 64
const CAPTURE_H = Math.ceil(CARD_H)
const SCALE = 1
// Every cell starts on a whole device pixel (a half-pixel row offset re-antialiases the whole card).
const STRIDE_X = CARD_W + 8
const STRIDE_Y = Math.ceil(CARD_H) + 8
const COLS = 13

// Home's game previews (GamePreview.tsx): each game's face-up cards on a transparent canvas, drawn by the same
// CardFace, laid out by the game's own previewLayout.ts. The backs stay live SVG underneath (they carry the profile's
// colour), so this layer must never need a back drawn ABOVE a face - checked per game below. Rasterized at 2x the
// 360x200 design canvas: the widest tile (the wide layout's grid) is ~240pt, 720px at 3x.
const PREVIEW_GAMES = ['klondike', 'freecell', 'yukon', 'canfield', 'fortythieves', 'spider', 'scorpion', 'pyramid', 'golf', 'tripeaks', 'acesup']
const PREVIEW_BUILDERS = { klondike: 'Klondike', freecell: 'FreeCell', yukon: 'Yukon', canfield: 'Canfield', fortythieves: 'FortyThieves', spider: 'Spider', scorpion: 'Scorpion', pyramid: 'Pyramid', golf: 'Golf', tripeaks: 'TriPeaks', acesup: 'AcesUp' }
const PREVIEW_SCALE = 3

function bundleFaces() {
  return bundle(
    WORK_DIR,
    `import { CardFace } from '@tastic/cards'
import { AppRegistry } from 'react-native'
import { darkColors, lightColors } from '${path.join(ROOT, 'src', 'components', 'palettes')}'
export * from '${path.join(ROOT, 'src', 'components', 'previewCanvas')}'
${PREVIEW_GAMES.map((g) => `export { build${PREVIEW_BUILDERS[g]}Preview } from '${path.join(ROOT, 'src', 'games', g, 'previewLayout')}'`).join('\n')}
export { AppRegistry, CardFace, darkColors, lightColors }
`
  )
}

function buildPages(mod) {
  const React = createRequire(import.meta.url)('react')

  // One HTML page of absolutely placed CardFaces (each `{ card, x, y, w, h }`), rendered by react-native-web. Each is
  // clipped to the card's rounded box like PlayingCard's own clip (theme.ts's cardRadiusForWidth): a court figure is
  // nudged down and spills past the card's bottom edge on purpose (CardFace's COURT_TOP_INSET_FRACTION).
  function writeFacePage(key, colors, invert, style, faces, width, height) {
    const element = React.createElement(
      'div',
      null,
      faces.map(({ card, x, y, w, h }, i) =>
        React.createElement('div', { key: i, style: { position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', overflow: 'hidden', borderRadius: w * 0.06 } }, React.createElement(mod.CardFace, { card, colors, width: w, height: h, cardStyle: style, invertDarkModeColors: invert }))
      )
    )
    return writePage(mod, WORK_DIR, key, element, width, height)
  }

  const previewW = mod.PREVIEW_CANVAS_WIDTH * PREVIEW_SCALE
  const previewH = mod.PREVIEW_CANVAS_HEIGHT * PREVIEW_SCALE
  const previewStride = previewH + 8
  const previewLayouts = PREVIEW_GAMES.map((game) => {
    const placements = mod[`build${PREVIEW_BUILDERS[game]}Preview`]()
    assertBacksBelowFaces(game, placements, mod.PREVIEW_CARD_WIDTH, mod.PREVIEW_CARD_HEIGHT)
    return placements
  })

  const pages = []
  for (const style of STYLES) {
    for (const [variant, { palette, invert }] of Object.entries(VARIANTS)) {
      const colors = mod[palette]
      const cells = []
      SUITS.forEach((suit, row) => RANKS.forEach((rank, col) => cells.push({ card: { id: `${suit}-${rank}`, suit, rank, faceUp: true }, x: col * STRIDE_X, y: row * STRIDE_Y, w: CARD_W, h: CARD_H })))
      const facePage = writeFacePage(`${style}-${variant}`, colors, invert, style, cells, COLS * STRIDE_X, SUITS.length * STRIDE_Y)
      pages.push({ ...facePage, shots: cells.map(({ card, x, y }) => ({ kind: 'face', style, variant, suit: card.suit, rank: card.rank, clip: { x, y, width: CARD_W, height: CAPTURE_H } })) })

      const previewFaces = []
      previewLayouts.forEach((placements, i) => {
        // Drawn through the tile's previewFrame, the same region GamePreview's viewBox shows, so the two layers line up.
        const frame = mod.previewFrame(placements)
        const s = (mod.PREVIEW_CANVAS_WIDTH / frame.width) * PREVIEW_SCALE
        placements.forEach((p) => {
          if (p.faceUp && p.card) previewFaces.push({ card: p.card, x: (p.x - frame.x) * s, y: i * previewStride + (p.y - frame.y) * s, w: mod.PREVIEW_CARD_WIDTH * s, h: mod.PREVIEW_CARD_HEIGHT * s })
        })
      })
      const previewPage = writeFacePage(`preview-${style}-${variant}`, colors, invert, style, previewFaces, previewW, PREVIEW_GAMES.length * previewStride)
      pages.push({ ...previewPage, shots: PREVIEW_GAMES.map((game, i) => ({ kind: 'preview', game, style, variant, clip: { x: 0, y: i * previewStride, width: previewW, height: previewH } })) })
    }
  }
  return pages
}

// GamePreview draws every back (live SVG, profile-coloured) under this image, so a back that the layout paints on top
// of an earlier face-up card would come out underneath it. Every current layout fans face-down cards first; fail loudly
// if one ever doesn't.
function assertBacksBelowFaces(game, placements, w, h) {
  placements.forEach((back, i) => {
    if (back.faceUp) return
    placements.slice(0, i).forEach((face) => {
      if (face.faceUp && Math.abs(face.x - back.x) < w && Math.abs(face.y - back.y) < h) throw new Error(`${game}'s preview paints a face-down card over a face-up one - GamePreview's back layer can't draw that`)
    })
  })
}

// Deduplicated on decoded pixels, then re-encoded as a 256-colour palette PNG: Chrome's own encoder is ~2x larger, and
// the quantization is invisible on these faces (mean error <0.2/255 on the most colourful court art; the
// compact/numeric/tarot faces have ~300 distinct colours to begin with). Returns each shot's file name.
function writePngs(shots, dir, nameFor) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const byHash = new Map()
  let bytes = 0
  const names = shots.map((shot) => {
    const decoded = UPNG.decode(shot.png)
    const rgba = UPNG.toRGBA8(decoded)[0]
    const hash = crypto.createHash('sha1').update(Buffer.from(rgba)).digest('hex')
    let name = byHash.get(hash)
    if (!name) {
      name = nameFor(shot)
      byHash.set(hash, name)
      const png = Buffer.from(UPNG.encode([rgba], decoded.width, decoded.height, 256))
      fs.writeFileSync(path.join(dir, name), png)
      bytes += png.length
    }
    return name
  })
  return { names, files: byHash.size, bytes }
}

function write(shots) {
  const { names, files, bytes } = writePngs(shots, OUT_DIR, (shot) => `${shot.style}-${shot.variant}-${shot.suit}-${shot.rank}.png`)
  const refs = {}
  shots.forEach((shot, i) => {
    ;(((refs[shot.style] ??= {})[shot.variant] ??= {})[shot.suit] ??= [])[shot.rank - 1] = names[i]
  })

  const lines = STYLES.map(
    (style) =>
      `  ${style}: {\n${Object.keys(VARIANTS)
        .map((variant) => `    ${variant}: {\n${SUITS.map((suit) => `      ${suit}: [\n${refs[style][variant][suit].map((name) => `        require('../../assets/cardFaces/${name}')`).join(',\n')}\n      ]`).join(',\n')}\n    }`)
        .join(',\n')}\n  }`
  )
  writeFormatted(
    INDEX_FILE,
    `// GENERATED by scripts/generate-card-face-bitmaps.mjs - do not edit by hand.
import type { Suit } from '@tastic/cards'
import type { ImageSourcePropType } from 'react-native'

export type CardFaceStyle = 'compact' | 'numeric' | 'tarot' | 'decorated'
/** 'normal': invertDarkModeColors off (any appearance), or on in light mode, where it is meant to be a
 * no-op. 'invert': invertDarkModeColors on in dark mode. */
export type CardFaceVariant = 'normal' | 'invert'

/** Every face-up card as CardFace draws it with this app's palettes, rasterized at ${CARD_W}x${CAPTURE_H}px
 * (CARD_WIDTH_MAX, 96pt, at 3x) - indexed [style][variant][suit][rank - 1]. See the generator's header for how. */
export const CARD_FACE_BITMAPS: Record<CardFaceStyle, Record<CardFaceVariant, Record<Suit, ImageSourcePropType[]>>> = {
${lines.join(',\n')}
}
`
  )
  return { files, bytes }
}

function writePreviews(shots) {
  const { names, files, bytes } = writePngs(shots, PREVIEW_OUT_DIR, (shot) => `${shot.game}-${shot.style}-${shot.variant}.png`)
  const refs = {}
  shots.forEach((shot, i) => {
    ;((refs[shot.game] ??= {})[shot.style] ??= {})[shot.variant] = names[i]
  })
  const lines = PREVIEW_GAMES.map((game) => `  ${game}: { ${STYLES.map((style) => `${style}: { ${Object.keys(VARIANTS).map((variant) => `${variant}: require('../../assets/previewFaces/${refs[game][style][variant]}')`).join(', ')} }`).join(', ')} }`)
  writeFormatted(
    PREVIEW_INDEX_FILE,
    `// GENERATED by scripts/generate-card-face-bitmaps.mjs - do not edit by hand.
import type { ImageSourcePropType } from 'react-native'

import type { CardFaceStyle, CardFaceVariant } from './cardFaceBitmaps'

export type PreviewGame = ${PREVIEW_GAMES.map((g) => `'${g}'`).join(' | ')}

/** Each Home preview's FACE-UP cards, drawn by CardFace on a transparent PREVIEW_CANVAS_WIDTH x PREVIEW_CANVAS_HEIGHT
 * canvas at ${PREVIEW_SCALE}x - indexed [game][style][variant]. GamePreview lays it over its live SVG card backs. */
export const PREVIEW_FACE_BITMAPS: Record<PreviewGame, Record<CardFaceStyle, Record<CardFaceVariant, ImageSourcePropType>>> = {
${lines.join(',\n')}
}
`
  )
  return { files, bytes }
}

const pages = buildPages(bundleFaces())
const shots = await capture(WORK_DIR, pages)
const faces = write(shots.filter((shot) => shot.kind === 'face'))
const previews = writePreviews(shots.filter((shot) => shot.kind === 'preview'))
fs.rmSync(WORK_DIR, { recursive: true, force: true })
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`
console.log(`wrote ${faces.files} card faces (${mb(faces.bytes)}) to ${path.relative(ROOT, OUT_DIR)}`)
console.log(`wrote ${previews.files} preview layers (${mb(previews.bytes)}) to ${path.relative(ROOT, PREVIEW_OUT_DIR)}`)
