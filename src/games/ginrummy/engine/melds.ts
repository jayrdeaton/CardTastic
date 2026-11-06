// Gin Rummy's melds: the sets and runs a hand can make, the arrangement that leaves the least deadwood, and the cards a
// defender lays off on the knocker's melds. Pure functions over plain cards.
//
// A set is three or four cards of a rank; a run is three or more cards of a suit in a row, Aces low (A-2-3, never
// Q-K-A). A card counts once: a hand that could use the same card in a set or a run is arranged whichever way leaves
// the fewest deadwood points.

import { type Card, SUITS } from '@tastic/cards'

/** A card's deadwood value: Aces 1, number cards their number, face cards 10. */
export function cardPoints(card: Card): number {
  return Math.min(card.rank, 10)
}

export function deadwoodPoints(cards: readonly Card[]): number {
  return cards.reduce((sum, card) => sum + cardPoints(card), 0)
}

export interface Meld {
  kind: 'set' | 'run'
  /** A run low to high; a set in suit order. */
  cards: Card[]
}

/** A hand laid out: its melds, low to high, and what's left over (deadwood), by rank. */
export interface Arrangement {
  melds: Meld[]
  deadwood: Card[]
  /** The deadwood's points. */
  points: number
}

const suitOrder = (card: Card) => SUITS.indexOf(card.suit)
const byRank = (a: Card, b: Card) => a.rank - b.rank || suitOrder(a) - suitOrder(b)

/** Every set and run the cards could make, a card in as many as it fits: each three of a four-card set is a set of its
 * own, and every stretch of three or more in a longer run is a run. */
export function candidateMelds(cards: readonly Card[]): Meld[] {
  const melds: Meld[] = []
  for (let rank = 1; rank <= 13; rank++) {
    const same = cards.filter((card) => card.rank === rank).sort(byRank)
    if (same.length < 3) continue
    melds.push({ kind: 'set', cards: same })
    if (same.length === 4) for (let skip = 0; skip < 4; skip++) melds.push({ kind: 'set', cards: same.filter((_, i) => i !== skip) })
  }
  for (const suit of SUITS) {
    const ranks = cards.filter((card) => card.suit === suit).sort(byRank)
    // Each stretch of consecutive ranks, then every run of three or more inside it.
    let start = 0
    for (let i = 1; i <= ranks.length; i++) {
      if (i < ranks.length && ranks[i].rank === ranks[i - 1].rank + 1) continue
      const stretch = ranks.slice(start, i)
      for (let from = 0; from + 3 <= stretch.length; from++) for (let to = from + 3; to <= stretch.length; to++) melds.push({ kind: 'run', cards: stretch.slice(from, to) })
      start = i
    }
  }
  return melds
}

/** Calls `visit` with every way the cards can be split into melds (no card in two) and what's left over. */
function forEachPacking(cards: readonly Card[], visit: (melds: Meld[], rest: Card[]) => void, prune?: (restPoints: number) => boolean) {
  const order = [...cards].sort(byRank)
  const candidates = candidateMelds(order)
  const meldsOf = new Map<string, Meld[]>()
  for (const meld of candidates) for (const card of meld.cards) meldsOf.set(card.id, [...(meldsOf.get(card.id) ?? []), meld])
  const decided = new Set<string>()
  const chosen: Meld[] = []
  const rest: Card[] = []
  let restPoints = 0
  // Each card in turn either starts one of the melds it's in (every other card of it still free) or is left over. A
  // card a later meld would need has been decided by the time that meld comes up, so every split is visited once.
  const search = (i: number) => {
    if (prune?.(restPoints)) return
    while (i < order.length && decided.has(order[i].id)) i++
    if (i === order.length) {
      visit(chosen, rest)
      return
    }
    const card = order[i]
    for (const meld of meldsOf.get(card.id) ?? []) {
      if (meld.cards.some((c) => decided.has(c.id))) continue
      for (const c of meld.cards) decided.add(c.id)
      chosen.push(meld)
      search(i + 1)
      chosen.pop()
      for (const c of meld.cards) decided.delete(c.id)
    }
    decided.add(card.id)
    rest.push(card)
    restPoints += cardPoints(card)
    search(i + 1)
    restPoints -= cardPoints(card)
    rest.pop()
    decided.delete(card.id)
  }
  search(0)
}

function arrangement(melds: Meld[], deadwood: Card[]): Arrangement {
  const sorted = [...melds].sort((a, b) => byRank(a.cards[0], b.cards[0]))
  return { melds: sorted, deadwood: [...deadwood].sort(byRank), points: deadwoodPoints(deadwood) }
}

/** The arrangement with the fewest deadwood points; on a tie, the one with the fewest cards left over. */
export function bestArrangement(cards: readonly Card[]): Arrangement {
  let best: Arrangement = arrangement([], [...cards])
  forEachPacking(
    cards,
    (melds, rest) => {
      const points = deadwoodPoints(rest)
      if (points < best.points || (points === best.points && rest.length < best.deadwood.length)) best = arrangement([...melds], [...rest])
    },
    (restPoints) => restPoints > best.points
  )
  return best
}

/** The deadwood a hand would have without one of its cards (the card thrown). */
export function deadwoodWithout(cards: readonly Card[], cardId: string): number {
  return bestArrangement(cards.filter((card) => card.id !== cardId)).points
}

/** A defender's hand laid down against a knock: their own melds, the cards they lay off on the knocker's, and the
 * deadwood left. */
export interface DefenderArrangement extends Arrangement {
  laidOff: Card[]
}

/** Lays off what it can on the knocker's melds, over and over (a card added to a run can let the next one on): a card
 * goes on a run before a set, since only one card can ever join a set but a run can keep growing. */
function layOff(deadwood: readonly Card[], knockerMelds: readonly Meld[]): { laidOff: Card[]; left: Card[] } {
  const runs = knockerMelds.filter((meld) => meld.kind === 'run').map((meld) => ({ suit: meld.cards[0].suit, low: meld.cards[0].rank, high: meld.cards[meld.cards.length - 1].rank }))
  const sets = knockerMelds.filter((meld) => meld.kind === 'set' && meld.cards.length === 3).map((meld) => ({ rank: meld.cards[0].rank, full: false }))
  const laidOff: Card[] = []
  let left = [...deadwood]
  let changed = true
  while (changed) {
    changed = false
    for (const card of left) {
      const run = runs.find((r) => r.suit === card.suit && (card.rank === r.low - 1 || card.rank === r.high + 1))
      if (run) {
        if (card.rank === run.low - 1) run.low = card.rank
        else run.high = card.rank
      } else {
        const set = sets.find((s) => !s.full && s.rank === card.rank)
        if (!set) continue
        set.full = true
      }
      laidOff.push(card)
      left = left.filter((c) => c.id !== card.id)
      changed = true
      break
    }
  }
  return { laidOff: laidOff.sort(byRank), left }
}

/** The defender's best answer to a knock: their own melds and the cards laid off on the knocker's, whichever way
 * leaves the fewest deadwood points. */
export function bestDefence(cards: readonly Card[], knockerMelds: readonly Meld[]): DefenderArrangement {
  let best: DefenderArrangement | null = null
  forEachPacking(cards, (melds, rest) => {
    const { laidOff, left } = layOff(rest, knockerMelds)
    const points = deadwoodPoints(left)
    if (!best || points < best.points || (points === best.points && left.length < best.deadwood.length)) best = { ...arrangement([...melds], left), laidOff }
  })
  return best ?? { ...arrangement([], [...cards]), laidOff: [] }
}
