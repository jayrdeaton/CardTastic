// Finds the winnable deals Settings' Winnable Deals deals from (src/constants/winnableSeeds.json), with the solver in
// @tastic/cardtastic-engine (its README, "Winnable deals"): a deal counts when some line wins it with every card known, the
// bar the Daily Deals use. Found here on a Mac, not on the phone: a phone (Hermes, no JIT) takes about 30 s of CPU for one
// winnable Canfield deal and over a minute for Forty Thieves (Jay, 2026-11-21, chose a list shipped in the app).
//
//   npm run winnable                          every rule set the solver covers, 1,000 deals each (about an hour)
//   npm run winnable -- --only fortythieves   just the rule sets whose id starts with "fortythieves", the rest kept
//   npm run winnable -- --count 500 --workers 4
//
// Find them again whenever a game's rules or deal change (the engine's CLAUDE.md says when): the winnableSeeds test replays
// one winning run per rule set (src/testUtils/winnableRuns.json) and fails when the rules no longer win it.
//
// Writes both files after each rule set is done, so a run stopped partway keeps what it found (run again with --only for
// the rest). Seeds are drawn at random (crypto), so every run finds other deals.
import { fork } from 'node:child_process'
import { randomInt } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findWinnableDeal, RULES_VERSION, SOLVABLE_VARIANTS } from '@tastic/cardtastic-engine'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const SEEDS_FILE = path.join(ROOT, 'src/constants/winnableSeeds.json')
const RUNS_FILE = path.join(ROOT, 'src/testUtils/winnableRuns.json')
// Deals a worker finds before it reports back
const CHUNK = 25
// The slowest first, so they don't trail at the end
const SLOW_FIRST = ['fortythieves', 'canfield', 'pyramid', 'golf', 'klondike-draw3']

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

// randomSeed()'s range, so a listed seed is one a random deal could have been
const nextSeed = () => randomInt(0, 2 ** 31)

if (process.env.WINNABLE_WORKER) {
  process.on('message', ({ variant, count }) => {
    const deals = []
    for (let i = 0; i < count; i++) {
      const { seed, run } = findWinnableDeal(variant, nextSeed)
      deals.push({ seed, run })
    }
    process.send({ variant, deals })
  })
} else {
  const COUNT = Number(arg('count', 1000))
  const WORKERS = Number(arg('workers', Math.max(1, os.cpus().length - 1)))
  const ONLY = arg('only', '')
  const variants = SOLVABLE_VARIANTS.filter((v) => v.startsWith(ONLY)).sort((a, b) => rank(a) - rank(b))
  function rank(variant) {
    const i = SLOW_FIRST.findIndex((slow) => variant.startsWith(slow))
    return i === -1 ? SLOW_FIRST.length : i
  }

  const read = (file, empty) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : empty)
  const seedsOut = read(SEEDS_FILE, { rulesVersion: RULES_VERSION, seeds: {} })
  const runsOut = read(RUNS_FILE, {})

  const found = new Map(variants.map((v) => [v, new Map()]))
  const queued = new Map(variants.map((v) => [v, 0]))
  const saved = new Set()
  const started = Date.now()
  const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`

  // The next chunk to find: the first rule set (slowest first) still short of COUNT, counting chunks already out
  function nextJob() {
    for (const variant of variants) {
      const short = COUNT - found.get(variant).size - queued.get(variant)
      if (short > 0) {
        const count = Math.min(CHUNK, short)
        queued.set(variant, queued.get(variant) + count)
        return { variant, count }
      }
    }
    return null
  }

  function save(variant) {
    const deals = found.get(variant)
    const seeds = [...deals.keys()].sort((a, b) => a - b)
    seedsOut.rulesVersion = RULES_VERSION
    seedsOut.seeds[variant] = seeds
    // Keep the variants in the engine's order, whatever order they finished in
    seedsOut.seeds = Object.fromEntries(SOLVABLE_VARIANTS.filter((v) => seedsOut.seeds[v]).map((v) => [v, seedsOut.seeds[v]]))
    runsOut[variant] = { seed: seeds[0], run: deals.get(seeds[0]) }
    const runs = Object.fromEntries(SOLVABLE_VARIANTS.filter((v) => runsOut[v]).map((v) => [v, runsOut[v]]))
    fs.writeFileSync(SEEDS_FILE, `${JSON.stringify(seedsOut)}\n`)
    fs.writeFileSync(RUNS_FILE, `${JSON.stringify(runs)}\n`)
  }

  console.log(`Finding ${COUNT} winnable deals for ${variants.length} rule sets on ${WORKERS} workers (rules ${RULES_VERSION})`)
  let running = 0
  const done = () => variants.every((v) => found.get(v).size >= COUNT)
  for (let w = 0; w < WORKERS; w++) {
    const worker = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, WINNABLE_WORKER: '1' } })
    running++
    const give = () => {
      const job = nextJob()
      if (job) worker.send(job)
      else {
        worker.kill()
        if (--running === 0 && !done()) console.log('Stopped short: run again with --only for the rest')
      }
    }
    worker.on('message', ({ variant, deals }) => {
      const map = found.get(variant)
      queued.set(variant, queued.get(variant) - deals.length)
      // A seed drawn twice (rare) is kept once, and its chunk's shortfall is queued again by nextJob
      for (const { seed, run } of deals) if (map.size < COUNT) map.set(seed, run)
      console.log(`${elapsed()} ${variant} ${map.size}/${COUNT}`)
      if (map.size >= COUNT && !saved.has(variant)) {
        saved.add(variant)
        save(variant)
        console.log(`${elapsed()} ${variant} done`)
      }
      give()
    })
    give()
  }
}
