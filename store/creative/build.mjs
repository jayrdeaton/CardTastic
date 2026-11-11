// The App Store's product page header and search results art (iOS 27's creative assets, see store/README.md), drawn
// by the app's own components at full size, never a lookalike: the felt is TableBackground, the colors are
// useTableColors' for the default player in dark mode, the cards are CardFaces (the four Aces fanned like the app
// icon, each suit's run cascading out like the win animation), the fireworks are SuitPips in their card inks, and the
// search art's phone shows the Klondike screenshot capture (store/screenshots/raw/iphone/01-klondike.png).
//
//   node store/creative/build.mjs
//
// Writes store/screenshots/header.png (3840 x 1646) and store/screenshots/search.png (3840 x 2560), each with -safe
// and -384 previews, through the app-store-prep skill's creative.mjs (CREATIVE=/path/to/creative.mjs to override).
// Same pipeline as scripts/generate-card-face-bitmaps.mjs: esbuild bundles the components for react-native-web,
// react-dom/server renders them to HTML, headless Chrome screenshots the page.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { build } from 'esbuild'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '../..')
const SCREENSHOTS = path.join(ROOT, 'store', 'screenshots')
// OUT_DIR=<folder> writes drafts somewhere else; `--only header` (or search) draws just that one.
const OUT_DIR = process.env.OUT_DIR ?? SCREENSHOTS
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const CREATIVE = process.env.CREATIVE ?? path.join(os.homedir(), '.claude/skills/app-store-prep/scripts/creative.mjs')
const CAPTURE = path.join(SCREENSHOTS, 'raw', 'iphone', '01-klondike.png')
// Inside the project, so the bundle and its externals resolve this app's node_modules.
const WORK = fs.mkdtempSync(path.join(HERE, '.build-'))

const ENTRY = `
export { CardFace, SuitPip, cardFaceColor, suitInk } from '@tastic/cards'
export { AppRegistry, View } from 'react-native'
export { TableBackground } from '@/components/TableBackground'
export { useTableColors } from '@/components/theme'
`

// The default player: no profile, no color picked (usePlayer's color is DEFAULT_SEED_COLOR), so useTableColors derives
// everything from it. And
// react-native-svg's web asset lookup, which imports a registry the web build doesn't install (nothing here is an asset).
// theme.ts's other imports are swapped for light stand-ins that give the same answers: auto-paper's color math alone
// (its full entry pulls in Expo native modules), and Paper's useTheme in dark mode, the appearance the screenshots use.
const AUTO_PAPER_UTILS = path.join(ROOT, 'node_modules/@rific/auto-paper/src/utils')
const STUBS = {
  '@/stores/profiles': `export { DEFAULT_SEED_COLOR } from ${JSON.stringify(path.join(ROOT, 'src/constants/theme.ts'))}\nimport { DEFAULT_SEED_COLOR } from ${JSON.stringify(path.join(ROOT, 'src/constants/theme.ts'))}\nexport const usePlayer = () => ({ color: DEFAULT_SEED_COLOR })`,
  '@react-native/assets-registry/registry': 'export const getAssetByID = () => null',
  'react-native-paper': 'export const useTheme = () => ({ dark: true })',
  '@rific/auto-paper': Object.entries({ getBlendedColor: 'getBlendedColor', getContrastColor: 'getSwatchContrast', getTonalColor: 'getTonalColor', getTriadicPalette: 'getTriadicPalette' })
    .map(([name, file]) => `export { ${name} } from ${JSON.stringify(path.join(AUTO_PAPER_UTILS, file))}`)
    .join('\n')
}
const profilesStub = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^(@\/stores\/profiles|@react-native\/assets-registry\/registry|react-native-paper|@rific\/auto-paper)$/ }, (args) => ({ path: args.path, namespace: 'stub' }))
    // react-native-svg's sound module is native only (TurboModuleRegistry), and nothing here plays a sound.
    b.onResolve({ filter: /NativeSvgSoundModule$/ }, () => ({ path: 'svg-sound', namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({ contents: STUBS[args.path] ?? 'export default null', loader: 'ts', resolveDir: ROOT }))
  }
}

try {
  const bundleFile = path.join(WORK, 'bundle.cjs')
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: bundleFile,
    logLevel: 'error',
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    // The web builds (react-native-svg's source is native-first and imports TurboModuleRegistry).
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser'],
    alias: { 'react-native': 'react-native-web', '@': path.join(ROOT, 'src') },
    external: ['react', 'react-dom', 'react-dom/server'],
    loader: { '.png': 'dataurl', '.ttf': 'dataurl', '.otf': 'dataurl', '.js': 'jsx' },
    jsx: 'automatic',
    define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [profilesStub]
  })
  const req = createRequire(import.meta.url)
  const React = req('react')
  const { renderToStaticMarkup } = req('react-dom/server')
  const m = req(bundleFile)
  const h = React.createElement
  const fontUrl = pathToFileURL(req.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf')).href

  // A card as PlayingCard draws it: rounded (cardRadiusForWidth), with its drop shadow, turned about its centre.
  function card({ key, x, y, w, art, deg = 0, z = 0 }) {
    return h(m.View, { key, style: { position: 'absolute', left: x - w / 2, top: y - (w * 93) / 64 / 2, width: w, height: (w * 93) / 64, zIndex: z, transform: [{ rotate: `${deg}deg` }], shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: w * 0.06, shadowOffset: { width: 0, height: w * 0.025 }, borderRadius: w * 0.06 } }, h(m.View, { style: { flex: 1, borderRadius: w * 0.06, overflow: 'hidden' } }, art))
  }
  const face = (colors, suit, rank, w) => h(m.CardFace, { card: { id: `${suit}-${rank}`, suit, rank, faceUp: true }, colors, width: w, height: (w * 93) / 64, cardStyle: 'compact' })

  // One suit's run thrown out of its Ace in a single arc, the 2 nearest the Ace and the King at the far end, the cards
  // spaced evenly along the arc so every card reads. The arc is a parabola from (x0, y0) toward `dir`: up `rise` px to its
  // top and down to (x0 + dir * reach, y0 + drop). Each card's corner index is at its top left, so the next card out goes
  // on top only where that leaves the index clear: always on a run thrown right, and on one thrown left only where it
  // falls more than it moves sideways (it lands below the index); elsewhere it goes underneath.
  function arc(colors, { suit, w, x0, y0, dir, rise, reach, drop, start = 0 }) {
    // y = k (h - a)^2 - k a^2 through the apex (a, -rise) and the end (reach, drop)
    const ratio = Math.sqrt((drop + rise) / rise)
    const a = reach / (1 + ratio)
    const k = rise / (a * a)
    const at = (hx) => ({ x: x0 + dir * hx, y: y0 + k * (hx - a) ** 2 - k * a * a })
    const pts = [{ h: 0, d: 0, ...at(0) }]
    for (let hx = 1; hx <= reach; hx += 1) {
      const p = at(hx)
      const q = pts[pts.length - 1]
      pts.push({ h: hx, d: q.d + Math.hypot(p.x - q.x, p.y - q.y), ...p })
    }
    const length = pts[pts.length - 1].d
    const spots = Array.from({ length: 12 }, (_, i) => pts.find((q) => q.d >= start + ((length - start) * i) / 11) ?? pts[pts.length - 1])
    const z = [50]
    for (let i = 1; i < spots.length; i++) {
      const dx = spots[i].x - spots[i - 1].x
      const dy = spots[i].y - spots[i - 1].y
      z.push(z[i - 1] + (dir > 0 || dy > Math.abs(dx) ? 1 : -1))
    }
    return spots.map((p, i) => card({ key: `${suit}-${2 + i}`, x: p.x, y: p.y, w, art: face(colors, suit, 2 + i, w), z: z[i] }))
  }

  // The four Aces fanned like the app icon (and Home's fan, but face up), centred on (cx, cy): the foundations, in the
  // order the games lay them out (FOUNDATION_SUITS), each card turning about one pivot below the fan.
  const ACES = ['spades', 'diamonds', 'clubs', 'hearts']
  function acePositions(cx, cy, w) {
    const pivot = w * 2.5
    return ACES.map((suit, i) => {
      const deg = (i - 1.5) * 13
      const a = (deg * Math.PI) / 180
      return { suit, deg, x: cx + pivot * Math.sin(a), y: cy + pivot - pivot * Math.cos(a) }
    })
  }

  // A pip firework: a ring of one suit's pips in its card ink, ringed in the card face's color.
  function burst(colors, { key, suit, cx, cy, radius, size, count }) {
    const ink = m.suitInk(suit, colors, { cardStyle: 'compact' })
    const outline = { color: m.cardFaceColor(colors), width: size * (1.25 / 14) }
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2
      return h(m.View, { key: `${key}-${i}`, style: { position: 'absolute', left: cx + Math.cos(a) * radius - size / 2, top: cy + Math.sin(a) * radius - size / 2, width: size, height: size, zIndex: 60, transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }] } }, h(m.SuitPip, { suit, color: ink, size, outline }))
    })
  }

  function page(name, width, height, art, overlay = '') {
    function Art() {
      const colors = m.useTableColors()
      return h(React.Fragment, null, h(m.TableBackground), ...art(colors))
    }
    function Page() {
      return h(m.View, { style: { position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' } }, h(Art))
    }
    m.AppRegistry.registerComponent(name, () => Page)
    const { element, getStyleElement } = m.AppRegistry.getApplication(name, {})
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'DejaVu Serif'; src: url('${fontUrl}'); font-weight: 100 900; }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #000; }
#root { position: absolute; inset: 0; }
.overlay { position: absolute; z-index: 100; font-family: 'DejaVu Serif', serif; color: #fff; }
</style>${renderToStaticMarkup(getStyleElement())}</head><body><div id="root">${renderToStaticMarkup(element)}</div>${overlay}</body></html>`
    const file = path.join(WORK, `${name}.html`)
    fs.writeFileSync(file, html)
    return file
  }

  // Header, 3840 x 1646: the whole deck, every card once (Jay, 2026-11-11: show all the suits, not one card repeated).
  // The four Aces fanned in the middle of the safe area (x 1097-2743, y 493-1154) like the app icon, and out of each its
  // suit's run, King leading, cascading to the edges like the win animation: spades and diamonds to the left, clubs and
  // hearts to the right, the inner Aces' runs thrown higher and farther, over the outer Aces' runs, so no two cross. Pip fireworks of all four suits in the top corners. No
  // words: the app's name sits right under it, and the screenshots follow.
  const headerFile = page('header', 3840, 1646, (colors) => {
    const aceW = 320
    const w = 190
    const aces = acePositions(1920, 800, aceW)
    const throws = {
      spades: { dir: -1, rise: 120, reach: 1000, drop: 600 },
      diamonds: { dir: -1, rise: 470, reach: 1620, drop: 440 },
      clubs: { dir: 1, rise: 470, reach: 1620, drop: 440 },
      hearts: { dir: 1, rise: 120, reach: 1000, drop: 600 }
    }
    return [
      ...aces.flatMap((a) => arc(colors, { suit: a.suit, w, x0: a.x + (a.x < 1920 ? -50 : 50), y0: a.y - 90, start: 120, ...throws[a.suit] })),
      ...burst(colors, { key: 'l', suit: 'hearts', cx: 230, cy: 250, radius: 150, size: 64, count: 10 }),
      ...burst(colors, { key: 'l2', suit: 'clubs', cx: 500, cy: 120, radius: 95, size: 48, count: 8 }),
      ...burst(colors, { key: 'r', suit: 'spades', cx: 3610, cy: 250, radius: 150, size: 64, count: 10 }),
      ...burst(colors, { key: 'r2', suit: 'diamonds', cx: 3340, cy: 120, radius: 95, size: 48, count: 8 }),
      ...aces.map((a, i) => card({ key: `ace-${a.suit}`, x: a.x, y: a.y, w: aceW, art: face(colors, a.suit, 1, aceW), deg: a.deg, z: 100 + i }))
    ]
  })

  // Search results, 3840 x 2560: state the obvious. The headline on the left and the Klondike screen on the right, both
  // inside the safe area (x 836-3004, y 765-1795); the phone runs off the bottom edge.
  const phoneScale = 0.72
  const phoneW = 1320 * phoneScale
  const phoneH = 2868 * phoneScale
  const bezel = 22
  const phoneLeft = 2040
  const phoneTop = 640
  const radius = 165 * phoneScale
  const searchOverlay = `
<div class="overlay" style="left:876px;top:765px;width:1100px;height:1030px;display:flex;flex-direction:column;justify-content:center;gap:60px">
  <div style="font-size:164px;line-height:1.1;font-weight:700;letter-spacing:1px;text-shadow:0 8px 30px rgba(0,0,0,0.4)">20 Classic<br>Card<br>Games</div>
  <div style="font-size:84px;line-height:1.25;opacity:0.85;letter-spacing:0.5px">No ads.<br>Plays offline.</div>
</div>
<div class="overlay" style="left:${phoneLeft - bezel}px;top:${phoneTop - bezel}px;padding:${bezel}px;background:#0a0a0a;border-radius:${radius + bezel}px;box-shadow:0 50px 140px rgba(0,0,0,0.6),0 0 0 4px rgba(255,255,255,0.10)">
  <div style="position:relative;width:${phoneW}px;height:${phoneH}px;border-radius:${radius}px;overflow:hidden">
    <img src="${pathToFileURL(CAPTURE).href}" style="display:block;width:${phoneW}px;height:${phoneH}px">
    <div style="position:absolute;left:${(phoneW - 378 * phoneScale) / 2}px;top:${41 * phoneScale}px;width:${378 * phoneScale}px;height:${111 * phoneScale}px;border-radius:${(111 * phoneScale) / 2}px;background:#000"></div>
  </div>
</div>`
  const searchFile = page('search', 3840, 2560, () => [], searchOverlay)

  for (const [file, placement] of [
    [headerFile, 'header'],
    [searchFile, 'search']
  ].filter(([, placement]) => !ONLY || placement === ONLY)) {
    execFileSync('node', [CREATIVE, file, placement, path.join(OUT_DIR, `${placement}.png`)], { stdio: 'inherit' })
  }
} finally {
  fs.rmSync(WORK, { recursive: true, force: true })
}
