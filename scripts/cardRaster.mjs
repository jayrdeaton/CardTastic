// The rendering both card-art generators share (generate-card-face-bitmaps.mjs, generate-card-back-bitmaps.mjs): an
// esbuild bundle of the app's own components with react-native aliased to react-native-web, pages of them rendered to
// static HTML by react-dom/server (react-native-svg has a real DOM implementation on web), and headless Chrome
// screenshots of those pages. Pixel-derived from the REAL components, never a lookalike.
//
// Needs Google Chrome installed (macOS path below, or CHROME=/path/to/chrome). Chrome runs with software rendering and
// every cell starts on a whole device pixel, so the output is byte-for-byte repeatable.
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.join(HERE, '..')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** A scratch folder inside the project (so the bundle and its entry resolve this app's node_modules), removed by the caller. */
export function makeWorkDir(prefix) {
  return fs.mkdtempSync(path.join(HERE, prefix))
}

/** Bundles `entrySource` (written to the work dir) for node, the way the app's components render on the web. Returns the
 * loaded module. */
export function bundle(workDir, entrySource) {
  const entryFile = path.join(workDir, 'entry.tsx')
  const bundleFile = path.join(workDir, 'bundle.cjs')
  fs.writeFileSync(entryFile, entrySource)
  // react-native-svg's web build imports React Native's asset registry, which React Native 0.88 no longer ships. Only an
  // svg <Image> with a require()d asset reads it, and the card art draws none, so a stub that finds nothing is enough. Two
  // more stay out of the bundle (esbuild can't link them against react-native-web): expo-modules-core, reached only
  // through Paper's optional icon-set requires (each in a try/catch), and react-native-svg's Android touch-sound module.
  const assetRegistryStub = path.join(workDir, 'assets-registry.js')
  fs.writeFileSync(assetRegistryStub, 'export function getAssetByID() { return undefined }\n')
  execSync(
    [
      `${path.join(ROOT, 'node_modules', '.bin', 'esbuild')} ${entryFile}`,
      '--bundle --format=cjs --platform=node',
      `--outfile=${bundleFile}`,
      '--resolve-extensions=.web.tsx,.web.ts,.web.js,.tsx,.ts,.js',
      '--main-fields=react-native,browser,module,main',
      '--conditions=react-native,browser',
      '--alias:react-native=react-native-web',
      `--alias:@=${path.join(ROOT, 'src')}`,
      `--alias:@react-native/assets-registry/registry=${assetRegistryStub}`,
      '--external:react --external:react-dom --external:react-dom/server',
      "--external:expo-modules-core --external:'*/NativeSvgSoundModule'",
      '--loader:.png=dataurl --loader:.ttf=dataurl --loader:.otf=dataurl --loader:.js=jsx',
      '--jsx=automatic',
      '--define:__DEV__=false --define:process.env.NODE_ENV=\\"production\\"',
      '--log-level=error'
    ].join(' '),
    { cwd: ROOT, stdio: 'inherit' }
  )
  return createRequire(import.meta.url)(bundleFile)
}

/** Writes one HTML page of `element` (a React element built from the bundle's components), rendered by react-native-web
 * through the bundle's AppRegistry, with the card font. Returns the page for `capture`. */
export function writePage(mod, workDir, key, element, width, height) {
  const req = createRequire(import.meta.url)
  const { renderToStaticMarkup } = req('react-dom/server')
  const fontUrl = pathToFileURL(req.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf')).href
  mod.AppRegistry.registerComponent(key, () => () => element)
  const app = mod.AppRegistry.getApplication(key, {})
  const body = renderToStaticMarkup(app.element)
  const css = renderToStaticMarkup(app.getStyleElement())
  // The app registers the Bold TTF under the plain family name (the pack's fonts), so every weight resolves to it -
  // declare the whole weight range so Chrome never synthesizes a bolder copy.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:'DejaVu Serif';src:url('${fontUrl}');font-weight:100 900}html,body{margin:0;background:transparent}#root{position:relative}</style>${css}</head><body><div id="root">${body}</div></body></html>`
  const file = path.join(workDir, `${key}.html`)
  fs.writeFileSync(file, html)
  return { file, width, height }
}

async function launchChrome(workDir) {
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${path.join(workDir, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-gpu', '--force-color-profile=srgb', '--disable-lcd-text', '--disable-font-subpixel-positioning', '--allow-file-access-from-files', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    proc.stderr.on('data', (d) => {
      buf += d
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) resolve(m[1])
    })
    proc.on('exit', (code) => reject(new Error(`chrome exited (${code}): ${buf}`)))
  })
  const port = new URL(wsUrl).port
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let nextId = 1
  const pending = new Map()
  const listeners = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(`${msg.error.message}`))
      else resolve(msg.result)
    } else if (msg.method) listeners.forEach((l) => l(msg))
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const once = (method) => new Promise((resolve) => listeners.push((m) => m.method === method && resolve(m.params)))
  return { proc, ws, send, once }
}

/** Screenshots every page's `shots` (each a `clip` in CSS pixels) on a transparent background, at the page's `scale`
 * device pixels per CSS pixel (1 if unset). Returns the shots with their PNG bytes. */
export async function capture(workDir, pages) {
  const chrome = await launchChrome(workDir)
  const { send, once } = chrome
  try {
    await send('Page.enable')
    await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    const shots = []
    for (const page of pages) {
      await send('Emulation.setDeviceMetricsOverride', { width: Math.ceil(page.width), height: Math.ceil(page.height), deviceScaleFactor: page.scale ?? 1, mobile: false })
      const loaded = once('Page.loadEventFired')
      await send('Page.navigate', { url: pathToFileURL(page.file).href })
      await loaded
      await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => document.fonts.size)', awaitPromise: true })
      for (const shot of page.shots) {
        const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...shot.clip, scale: 1 } })
        shots.push({ ...shot, png: Buffer.from(data, 'base64') })
      }
    }
    return shots
  } finally {
    chrome.ws.close()
    chrome.proc.kill()
  }
}

/** Writes a generated source file, formatted by the repo's prettier config (printWidth 1000 wants each array on one line). */
export function writeFormatted(file, source) {
  fs.writeFileSync(file, source)
  execSync(`${path.join(ROOT, 'node_modules', '.bin', 'prettier')} --write ${file}`, { cwd: ROOT, stdio: 'ignore' })
}
