import { ruleChoiceLabel, ruleSummary } from '@/components/gameRule'
import { GAME_RULE_SETTINGS, ruleGameForPath } from '@/games/ruleSettings'
import { MATCH_GAME_IDS } from '@/redux/matchStatsSlice'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import type { Settings } from '@/types'

// Every game's rules, as the Settings sheet shows them (games/ruleSettings.ts). Each rule must show a choice that's
// really in effect, and each choice must write a setting that reads back as that choice.

const SOLITAIRE_WITH_RULES = ['klondike', 'spider', 'golf', 'tripeaks', 'canfield', 'scorpion', 'fortythieves']

describe('every game with rules', () => {
  it('is every solitaire game with a rule and every two-player game', () => {
    expect(Object.keys(GAME_RULE_SETTINGS).sort()).toEqual([...SOLITAIRE_WITH_RULES, ...MATCH_GAME_IDS].sort())
  })

  it.each(Object.entries(GAME_RULE_SETTINGS))("%s's rules each show a choice in effect, and every choice reads back once picked", (_, game) => {
    const rules = game.rules(DEFAULT_SETTINGS, () => undefined)
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.choices.map((choice) => choice.value)).toContain(rule.value)
      expect(rule.label).toMatch(/^[A-Z]/)
      for (const choice of rule.choices) {
        let patch: Partial<Settings> = {}
        game
          .rules(DEFAULT_SETTINGS, (p) => (patch = p))
          .find((r) => r.key === rule.key)!
          .onChange(choice.value)
        const after = game.rules({ ...DEFAULT_SETTINGS, ...patch }, () => undefined).find((r) => r.key === rule.key)!
        expect(after.value).toBe(choice.value)
        expect(ruleChoiceLabel(after)).toBe(choice.label)
      }
    }
  })
})

describe('ruleGameForPath', () => {
  it('finds the game a route is in when it has rules', () => {
    expect(ruleGameForPath('/play/klondike')).toBe('klondike')
    expect(ruleGameForPath('/loadout/crazyeights')).toBe('crazyeights')
    expect(ruleGameForPath('/play/freecell')).toBeNull()
    expect(ruleGameForPath('/')).toBeNull()
    expect(ruleGameForPath('/stats')).toBeNull()
    expect(ruleGameForPath('/play/constructor')).toBeNull()
  })
})

describe('ruleSummary', () => {
  it("joins the choices in effect, as a setup screen sums a game's rules up", () => {
    const rules = GAME_RULE_SETTINGS.crazyeights.rules(DEFAULT_SETTINGS, () => undefined)
    expect(ruleSummary(rules)).toBe('Keep Drawing · Only 8s · 7 Cards, 5 for 3+')
  })
})
