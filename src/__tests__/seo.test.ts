import type { Metadata } from 'expo-router/server'

import * as homeRoute from '@/app/index'
import * as loadoutRoute from '@/app/loadout/[game]'
import * as playRoute from '@/app/play/[game]'
import * as profilesRoute from '@/app/profiles'
import * as statsRoute from '@/app/stats'
import { games } from '@/pack'
import { GAME_DESCRIPTION, gameMetadata, gamePath, homeMetadata, PACK_DESCRIPTION, screenMetadata } from '@/utils/seo'

// The web build's titles, descriptions, canonical links and link previews (src/utils/seo.tsx). build:web serves the export
// under /cardtastic, which Expo inlines as EXPO_BASE_URL.

const ORIGIN = 'https://games.infinitetoken.com/cardtastic'
const savedBase = process.env.EXPO_BASE_URL

beforeAll(() => {
  process.env.EXPO_BASE_URL = '/cardtastic'
})

afterAll(() => {
  if (savedBase === undefined) delete process.env.EXPO_BASE_URL
  else process.env.EXPO_BASE_URL = savedBase
})

const metadataOf = (route: { generateMetadata?: unknown }, params: Record<string, string> = {}) => (route.generateMetadata as (request: undefined, params: Record<string, string>) => Metadata)(undefined, params)

describe('the web pages', () => {
  it("give Home the pack's title, description, canonical link and link preview", () => {
    const home = homeMetadata()
    expect(home).toMatchObject({
      title: 'CardTastic: Solitaire & More | Infinite Token Games',
      description: PACK_DESCRIPTION,
      alternates: { canonical: `${ORIGIN}/` },
      openGraph: { title: 'CardTastic: Solitaire & More | Infinite Token Games', description: PACK_DESCRIPTION, url: `${ORIGIN}/`, siteName: 'Infinite Token Games', images: [{ url: 'https://games.infinitetoken.com/images/og.png', width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', title: 'CardTastic: Solitaire & More | Infinite Token Games' }
    })
    expect(home.robots).toBeUndefined()
  })

  it('name real games in the pack, and count them right', () => {
    expect(games).toHaveLength(20)
    expect(PACK_DESCRIPTION).toMatch(/^Twenty /)
    expect(GAME_DESCRIPTION).toContain(' twenty ')
    const titles = games.map((g) => g.title)
    for (const name of ['Klondike', 'FreeCell', 'Spider', 'Pyramid', 'Gin Rummy', 'Crazy Eights', 'Speed', 'War']) {
      expect(PACK_DESCRIPTION).toContain(name)
      expect(titles).toContain(name)
    }
  })

  // A solitaire game (no seat 2) is named with the word people search for after it: Klondike Solitaire
  it.each(games.map((g) => [g.seatTwo ? g.title : `${g.title} Solitaire`, g]))('give %s a page of its own, canonical at the screen Home opens', (name, game) => {
    const path = game.useLoadout ? `/loadout/${game.id}` : `/play/${game.id}`
    expect(gamePath(game)).toBe(path)
    expect(gameMetadata(game.id)).toMatchObject({
      title: `${name} | CardTastic | Infinite Token Games`,
      description: `${game.blurb} ${GAME_DESCRIPTION}`,
      alternates: { canonical: `${ORIGIN}${path}` },
      openGraph: { url: `${ORIGIN}${path}` }
    })
    // Its play page, and its loadout page when it has one, carry the same, so the two count as one
    if (game.useLoadout) expect(metadataOf(loadoutRoute, { game: game.id })).toEqual(gameMetadata(game.id))
    expect(metadataOf(playRoute, { game: game.id })).toEqual(gameMetadata(game.id))
  })

  it("give an id the pack doesn't have Home's", () => {
    expect(gameMetadata('[game]')).toEqual(homeMetadata())
    expect(gameMetadata(undefined)).toEqual(homeMetadata())
  })

  it('keep Stats and Profiles out of search results', () => {
    expect(metadataOf(statsRoute)).toMatchObject({ title: 'Stats | CardTastic | Infinite Token Games', robots: 'noindex', alternates: { canonical: `${ORIGIN}/stats` } })
    expect(metadataOf(profilesRoute)).toMatchObject({ title: 'Profiles | CardTastic | Infinite Token Games', robots: 'noindex', alternates: { canonical: `${ORIGIN}/profiles` } })
    expect(screenMetadata('Stats', '/stats')).toEqual(metadataOf(statsRoute))
  })

  it('export Home from its route', () => {
    expect(metadataOf(homeRoute)).toEqual(homeMetadata())
  })

  it('use no em or en dashes', () => {
    const copy = JSON.stringify([homeMetadata(), ...games.map((g) => gameMetadata(g.id)), screenMetadata('Stats', '/stats')])
    expect(copy).not.toMatch(/[–—]/)
  })
})
