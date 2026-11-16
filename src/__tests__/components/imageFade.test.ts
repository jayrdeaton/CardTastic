import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

import { NO_IMAGE_FADE } from '@/components/imageFade'

// Android's Image fades a bitmap that isn't an Android resource in over 300ms (a Metro-served build's, an OTA update's
// new images), and a card face's onLoad, which a landed ghost hands over on, comes before that fade ends. imageFade.ts
// has the story; every Image here appears whole the frame it loads.

const SRC = join(__dirname, '..', '..')

/** Every app source file (tests and mocks left out). */
function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' || name === '__mocks__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

/** Each `<Image ... />` tag in a source, up to its closing `/>`. */
function imageTags(source: string): string[] {
  return [...source.matchAll(/<(?:Animated\.)?Image\b[\s\S]*?\/>/g)].map((match) => match[0])
}

describe('images', () => {
  it('never fade in on Android', () => {
    expect(NO_IMAGE_FADE).toBe(0)
    const tags = sourceFiles().flatMap((file) => imageTags(readFileSync(file, 'utf8')).map((tag) => ({ file: relative(SRC, file), tag })))
    expect(tags.length).toBeGreaterThanOrEqual(3)
    expect(tags.filter(({ tag }) => !tag.includes('fadeDuration={NO_IMAGE_FADE}')).map(({ file }) => file)).toEqual([])
  })
})
