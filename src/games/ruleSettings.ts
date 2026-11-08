// Every game's rules, by game id, for the Settings sheet (components/SettingsSections.tsx shows the rules of the game
// it's opened in, found from the route: /play/<id> or /loadout/<id>). Seven solitaire games and every two-player game
// have rules; FreeCell, Pyramid, Yukon and Aces Up have none. Each game builds its own (its ruleSettings.ts), pure and
// light: nothing here loads a screen.

import type { GameRuleBuilder } from '@/components/gameRule'
import { canfieldRuleSettings } from '@/games/canfield/ruleSettings'
import { eightsRuleSettings } from '@/games/crazyeights/ruleSettings'
import { fortyThievesRuleSettings } from '@/games/fortythieves/ruleSettings'
import { crownsRuleSettings } from '@/games/fourcrowns/ruleSettings'
import { ginRuleSettings } from '@/games/ginrummy/ruleSettings'
import { golfRuleSettings } from '@/games/golf/ruleSettings'
import { klondikeRuleSettings } from '@/games/klondike/ruleSettings'
import { MATCH_GAME_TITLES } from '@/games/matchGameTitles'
import { ratslapRuleSettings } from '@/games/ratslap/ruleSettings'
import { scorpionRuleSettings } from '@/games/scorpion/ruleSettings'
import { sixCardGolfRuleSettings } from '@/games/sixcardgolf/ruleSettings'
import { slapjackRuleSettings } from '@/games/slapjack/ruleSettings'
import { speedRuleSettings } from '@/games/speed/ruleSettings'
import { spiderRuleSettings } from '@/games/spider/ruleSettings'
import { trashRuleSettings } from '@/games/trash/ruleSettings'
import { tripeaksRuleSettings } from '@/games/tripeaks/ruleSettings'
import { warRuleSettings } from '@/games/war/ruleSettings'
import { GAME_TITLES } from '@/stores/statsTypes'

export interface GameRuleSettings {
  title: string
  rules: GameRuleBuilder
}

export const GAME_RULE_SETTINGS: Record<string, GameRuleSettings> = {
  klondike: { title: GAME_TITLES.klondike, rules: klondikeRuleSettings },
  spider: { title: GAME_TITLES.spider, rules: spiderRuleSettings },
  golf: { title: GAME_TITLES.golf, rules: golfRuleSettings },
  tripeaks: { title: GAME_TITLES.tripeaks, rules: tripeaksRuleSettings },
  canfield: { title: GAME_TITLES.canfield, rules: canfieldRuleSettings },
  scorpion: { title: GAME_TITLES.scorpion, rules: scorpionRuleSettings },
  fortythieves: { title: GAME_TITLES.fortythieves, rules: fortyThievesRuleSettings },
  ratslap: { title: MATCH_GAME_TITLES.ratslap, rules: ratslapRuleSettings },
  slapjack: { title: MATCH_GAME_TITLES.slapjack, rules: slapjackRuleSettings },
  speed: { title: MATCH_GAME_TITLES.speed, rules: speedRuleSettings },
  war: { title: MATCH_GAME_TITLES.war, rules: warRuleSettings },
  sixcardgolf: { title: MATCH_GAME_TITLES.sixcardgolf, rules: sixCardGolfRuleSettings },
  trash: { title: MATCH_GAME_TITLES.trash, rules: trashRuleSettings },
  ginrummy: { title: MATCH_GAME_TITLES.ginrummy, rules: ginRuleSettings },
  fourcrowns: { title: MATCH_GAME_TITLES.fourcrowns, rules: crownsRuleSettings },
  crazyeights: { title: MATCH_GAME_TITLES.crazyeights, rules: eightsRuleSettings }
}

/** The game a route is in (its last path segment), if that game has rules: '/play/klondike' and '/loadout/ginrummy'
 * have, '/' and '/play/freecell' don't. */
export function ruleGameForPath(path: string): string | null {
  const id = path.split('/').filter(Boolean).pop()
  return id && Object.prototype.hasOwnProperty.call(GAME_RULE_SETTINGS, id) ? id : null
}
