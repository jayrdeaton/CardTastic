import { GUIDE_VERSION } from '@/constants/guide'
import { DEFAULT_SEED_COLOR } from '@/constants/theme'
import { games, pack } from '@/pack'
import { storeSource } from '@/redux/store'
import { GAME_TITLES, SOLITAIRE_GAME_IDS } from '@/stores/statsTypes'

// Solitaire as @tastic/shell's pack (pack.ts): the eleven solitaire games Home lists, each a game with no seats, no loadout
// and no How to Play of its own, every one resumable, with a preview and a rules sheet; then RatSlap, for two players.

const SOLITAIRE_ORDER = ['klondike', 'freecell', 'yukon', 'canfield', 'fortythieves', 'spider', 'scorpion', 'pyramid', 'golf', 'tripeaks', 'acesup']
const HOME_ORDER = [...SOLITAIRE_ORDER, 'ratslap']

describe('the pack', () => {
  it("lists the eleven solitaire games and RatSlap in Home's order", () => {
    expect(games.map((g) => g.id)).toEqual(HOME_ORDER)
    expect(pack.games).toBe(games)
  })

  it('holds every game the stats know, and the store is built from the same ids', () => {
    expect([...SOLITAIRE_ORDER].sort()).toEqual([...SOLITAIRE_GAME_IDS].sort())
    const storeGames = storeSource.games as readonly { id: string; resumable?: boolean }[]
    expect(storeGames.map((g) => g.id)).toEqual([...SOLITAIRE_GAME_IDS, 'ratslap'])
    expect(storeGames.map((g) => g.id).sort()).toEqual(games.map((g) => g.id).sort())
    // Each store entry says what its game's definition says about resuming.
    storeGames.forEach((entry) => expect(!!entry.resumable).toBe(!!games.find((g) => g.id === entry.id)?.resumable))
  })

  it.each(SOLITAIRE_ORDER)('%s: resumable, keeps the status bar, with its title, a preview, rules, a play screen and its stats', (id) => {
    const game = games.find((g) => g.id === id)!
    expect(game.title).toBe(GAME_TITLES[id as keyof typeof GAME_TITLES])
    expect(game.blurb.length).toBeGreaterThan(0)
    expect(game.resumable).toBe(true)
    expect(game.keepStatusBar).toBe(true)
    expect(game.Preview).toBeDefined()
    expect(game.Rules).toBeDefined()
    expect(game.PlayScreen).toBeDefined()
    expect(game.StatsSections).toBeDefined()
    expect(game.reducers).toEqual({})
  })

  it.each(SOLITAIRE_ORDER)('%s: no seat 2, no loadout and no How to Play of its own', (id) => {
    const game = games.find((g) => g.id === id)!
    expect(game.seatTwo).toBeUndefined()
    expect(game.useLoadout).toBeUndefined()
    expect(game.guide).toBeUndefined()
  })

  it('RatSlap: seat 2 the CPU or a person, a setup screen and its own How to Play, not resumable, the status bar hidden', () => {
    const game = games.find((g) => g.id === 'ratslap')!
    expect(game.title).toBe('RatSlap')
    expect(game.seatTwo).toEqual(['cpu', 'person'])
    expect(game.useLoadout).toBeDefined()
    expect(game.guide?.version).toBeGreaterThan(0)
    expect(Object.keys(game.reducers)).toEqual(['ratslapGuide'])
    expect(game.resumable).toBe(false)
    expect(game.keepStatusBar).toBe(false)
    expect(game.Preview).toBeDefined()
    expect(game.Rules).toBeDefined()
    expect(game.PlayScreen).toBeDefined()
    expect(game.StatsSections).toBeDefined()
  })

  it("teaches every game with the pack's own How to Play, its seen version Solitaire's own guide key", () => {
    expect(pack.guide?.version).toBe(GUIDE_VERSION)
  })

  it('is drawn on the felt, in the card font, with its own sounds, toaster, settings sections and hero', () => {
    expect(pack.Backdrop).toBeDefined()
    expect(pack.fontFamily).toBeDefined()
    expect(pack.useFeedbackSounds).toBeDefined()
    expect(pack.Toaster).toBeDefined()
    expect(pack.SettingsSections).toBeDefined()
    expect(pack.HeroTitle).toBeDefined()
    expect(pack.wordmark[0]).toBe('Solitaire')
    expect(pack.edgeGuard).toBe(false)
  })

  it("keeps guest's stats its own, with Solitaire's stats sections, a Records tab, one achievement list and a Reset by player", () => {
    expect(pack.guestStats).toBe(true)
    expect(pack.StatsSections).toBeDefined()
    expect(pack.statsTabs?.map((t) => t.label)).toEqual(['Records'])
    expect(pack.AchievementList).toBeDefined()
    expect(pack.resetStats).toBeDefined()
    // Each rule set's well already names its game.
    expect(pack.statsGameTitles).toBe(false)
    expect(pack.newProfileColor).toBe(DEFAULT_SEED_COLOR)
  })
})
