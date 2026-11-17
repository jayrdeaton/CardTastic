import { type useToast } from '@rific/toaster'

import type { PlayerPar } from '@/engine/par'
import { commaString } from '@/utils/commaString'

type InfoToast = ReturnType<typeof useToast>['info']

/** The toast a pressed Hint shows when there is nothing to suggest (an Auto Hint says nothing), with the Hint button's own light bulb switched off. */
export function showNoHintToast(info: InfoToast) {
  info('No helpful moves right now.', undefined, undefined, { icon: 'lightbulb-off-outline' })
}

/** The player's par in this rule set, and what it is, shown when they hold the score (GameChrome). Kept off the
 * scoreboard itself (Jay, 2026-11-17: nothing more in the bottom band). `wins`: how many recent wins it comes from. */
export function showParToast(info: InfoToast, par: PlayerPar, wins: number) {
  // Each caption fits one line on a 360pt phone (measured in the app font): "Middle score of your last 7 wins here" left
  // "here" alone on a second line even at 402.
  if (par.kind === 'expert') info(`Expert par is ${commaString(par.score)}`, 'Win one to set your own', undefined, { icon: 'golf' })
  else info(`Your par is ${commaString(par.score)}`, wins === 1 ? 'From your one win so far' : `Middle of last ${wins} wins`, undefined, { icon: 'golf' })
}
