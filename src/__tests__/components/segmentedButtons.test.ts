import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

import { SEGMENT_RADIUS, SEGMENT_THEME } from '@/components/segmentedButtons'

// Paper's SegmentedButtons smear the last segment's left border across it on iOS when the ends' corner image (twice the
// corner plus a point) is taller than the segment, whose height comes out a fraction over a whole point there (40.33 at
// the regular density). segmentedButtons.ts has the whole story; every switch here takes its theme and the regular size.

const SRC = join(__dirname, '..', '..')

/** Every app source file (tests and mocks left out). */
function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' || name === '__mocks__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

/** Each `<SegmentedButtons ... />` tag in a source, up to its closing `/>`. */
function segmentedTags(source: string): string[] {
  return [...source.matchAll(/<SegmentedButtons\b[\s\S]*?\/>/g)].map((match) => match[0])
}

describe('segmented switches', () => {
  it('round their ends so the corner image fits a regular segment', () => {
    // React Native's border image for an end segment: the corner, less the 1pt border, rounded up, on each side of a 1pt middle, plus the borders.
    expect(2 * (1 + Math.ceil(SEGMENT_RADIUS - 1)) + 1).toBeLessThanOrEqual(40)
    expect(SEGMENT_RADIUS).toBe(19)
  })

  it('every SegmentedButtons in the app takes that theme and the regular density', () => {
    const tags = sourceFiles().flatMap((file) => segmentedTags(readFileSync(file, 'utf8')).map((tag) => ({ file: relative(SRC, file), tag })))
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.filter(({ tag }) => !tag.includes('theme={SEGMENT_THEME}') || /density=/.test(tag)).map(({ file }) => file)).toEqual([])
    expect(SEGMENT_THEME.roundness).toBe(3.8)
  })
})
