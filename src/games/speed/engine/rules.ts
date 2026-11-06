// Speed for two players, as pure functions over one state. Every function that changes the state returns a new one, or
// null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-05):
// - Each player has a hand of five and a draw pile of fifteen; two side piles of five sit either side of two center
//   piles, each started with one card.
// - There are no turns: play any card from your hand onto either center pile when it's one rank higher or lower, suit
//   no matter. Ranks wrap: a King goes on an Ace, an Ace on a King or a 2 (or, the setup screen's choice, they don't).
// - Your hand refills from your draw pile by itself after every play (or, the setup screen's choice, a card a tap on
//   your draw pile, up to five). The side piles turn only once nobody can play or draw.
// - When nobody can play, a card from each side pile is turned onto the center pile beside it. Once the side piles are
//   gone, the center piles (all but their top cards) are shuffled into new ones.
// - The first to play every card in their hand and draw pile wins.

import { type Card } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'

import { DEADLOCK_TURNS, DEFAULT_SPEED_RULES, DRAW_SIZE, HAND_SIZE, type PlayerIndex, SIDE_SIZE, type SpeedRules, type SpeedState } from './types'

/** Whether `card` goes on a center pile whose top is `top`: one rank apart, a King and an Ace included while ranks
 * wrap. */
export function fits(card: Card, top: Card, wrap = true): boolean {
  const diff = Math.abs(card.rank - top.rank)
  return diff === 1 || (wrap && diff === 12)
}

export function handOf(state: SpeedState, player: PlayerIndex): (Card | null)[] {
  return state.hands[player - 1]
}

function withPlayer<T>(pair: [T, T], player: PlayerIndex, value: T): [T, T] {
  return player === 1 ? [value, pair[1]] : [pair[0], value]
}

function withPile<T>(pair: [T, T], pile: number, value: T): [T, T] {
  return pile === 0 ? [value, pair[1]] : [pair[0], value]
}

const up = (card: Card): Card => ({ ...card, faceUp: true })
const down = (card: Card): Card => ({ ...card, faceUp: false })

export function createSpeedMatch(seed: number, rules: SpeedRules = DEFAULT_SPEED_RULES): SpeedState {
  const deck = shuffle(makeDeck(), mulberry32(seed))
  let at = 0
  const take = (count: number) => deck.slice(at, (at += count))
  const handOne = take(HAND_SIZE).map(up)
  const drawOne = take(DRAW_SIZE)
  const handTwo = take(HAND_SIZE).map(up)
  const drawTwo = take(DRAW_SIZE)
  const sides: [Card[], Card[]] = [take(SIDE_SIZE), take(SIDE_SIZE)]
  const centers: [Card[], Card[]] = [take(1).map(up), take(1).map(up)]
  return { rules, hands: [handOne, handTwo], draws: [drawOne, drawTwo], sides, centers, winner: null, seed, refills: 0, turnsWithoutPlay: 0 }
}

/** The center piles a card can go on. */
export function pilesFor(state: SpeedState, card: Card): number[] {
  return [0, 1].filter((pile) => {
    const top = state.centers[pile][state.centers[pile].length - 1]
    return !!top && fits(card, top, state.rules.wrap)
  })
}

/** Whether the player has a card that can go on either center pile. */
export function hasMove(state: SpeedState, player: PlayerIndex): boolean {
  return handOf(state, player).some((card) => !!card && pilesFor(state, card).length > 0)
}

/** Whether the player can draw a card into their hand: drawing by hand, with an empty spot and cards in their pile. */
export function canDraw(state: SpeedState, player: PlayerIndex): boolean {
  return state.winner === null && state.rules.refill === 'tap' && state.draws[player - 1].length > 0 && handOf(state, player).some((card) => card === null)
}

/** Nobody can play or draw: the side piles get turned. */
export function isStuck(state: SpeedState): boolean {
  return state.winner === null && !hasMove(state, 1) && !hasMove(state, 2) && !canDraw(state, 1) && !canDraw(state, 2)
}

/** Cards a player has still to play: their hand and their draw pile. */
export function cardsLeft(state: SpeedState, player: PlayerIndex): number {
  return handOf(state, player).filter(Boolean).length + state.draws[player - 1].length
}

/** For a card that fits both center piles, the one that leaves the player's other cards the most to play on. */
export function bestPile(state: SpeedState, player: PlayerIndex, slot: number): number | null {
  const card = handOf(state, player)[slot]
  if (!card) return null
  const piles = pilesFor(state, card)
  if (piles.length < 2) return piles[0] ?? null
  const rest = handOf(state, player).filter((other, i) => i !== slot && !!other) as Card[]
  const followUps = (pile: number) => {
    const otherTop = state.centers[1 - pile][state.centers[1 - pile].length - 1]
    return rest.filter((other) => fits(other, card, state.rules.wrap) || fits(other, otherTop, state.rules.wrap)).length
  }
  return followUps(1) > followUps(0) ? 1 : 0
}

/** The card in the player's `slot` onto center pile `pile` (or the best pile it fits), the slot refilled from their draw
 * pile (left empty when they draw by hand). Playing their last card wins. */
export function playCard(state: SpeedState, player: PlayerIndex, slot: number, pile?: number): SpeedState | null {
  if (state.winner !== null) return null
  const hand = handOf(state, player)
  const card = hand[slot]
  if (!card) return null
  const target = pile ?? bestPile(state, player, slot)
  if (target === null || !pilesFor(state, card).includes(target)) return null
  const draw = state.draws[player - 1]
  const refill = draw.length > 0 && state.rules.refill === 'auto' ? up(draw[draw.length - 1]) : null
  const next: SpeedState = {
    ...state,
    hands: withPlayer(
      state.hands,
      player,
      hand.map((c, i) => (i === slot ? refill : c))
    ),
    draws: withPlayer(state.draws, player, refill ? draw.slice(0, -1) : draw),
    centers: withPile(state.centers, target, [...state.centers[target], up(card)]),
    turnsWithoutPlay: 0
  }
  return cardsLeft(next, player) === 0 ? { ...next, winner: player } : next
}

/** Drawing by hand: the top card of the player's draw pile into the first empty spot in their hand. */
export function drawCard(state: SpeedState, player: PlayerIndex): SpeedState | null {
  if (!canDraw(state, player)) return null
  const hand = handOf(state, player)
  const draw = state.draws[player - 1]
  const slot = hand.findIndex((card) => card === null)
  return {
    ...state,
    hands: withPlayer(
      state.hands,
      player,
      hand.map((c, i) => (i === slot ? up(draw[draw.length - 1]) : c))
    ),
    draws: withPlayer(state.draws, player, draw.slice(0, -1))
  }
}

/** With nothing left anyone can play, the player with fewer cards left wins. */
function deadlocked(state: SpeedState): SpeedState {
  const [one, two] = [cardsLeft(state, 1), cardsLeft(state, 2)]
  return { ...state, winner: one === two ? 'tie' : one < two ? 1 : 2 }
}

/** When nobody can play: a card from each side pile onto the center pile beside it. Out of side cards, the center
 * piles (all but their tops) are shuffled into new side piles first. With nothing left to turn over, or after
 * DEADLOCK_TURNS turned with nobody able to play, the match is deadlocked. */
export function turnSides(state: SpeedState): SpeedState | null {
  if (!isStuck(state)) return null
  if (state.turnsWithoutPlay >= DEADLOCK_TURNS) return deadlocked(state)
  let { sides, centers, refills } = state
  if (sides[0].length === 0 && sides[1].length === 0) {
    const pool = [...centers[0].slice(0, -1), ...centers[1].slice(0, -1)].map(down)
    if (pool.length === 0) return deadlocked(state)
    refills++
    const shuffled = shuffle(pool, mulberry32((state.seed + Math.imul(refills, 0x9e3779b1)) >>> 0))
    const half = Math.ceil(shuffled.length / 2)
    sides = [shuffled.slice(0, half), shuffled.slice(half)]
    centers = [centers[0].slice(-1), centers[1].slice(-1)]
  }
  const turned = (pile: number): [Card[], Card[]] => {
    const side = sides[pile]
    return side.length === 0 ? [side, centers[pile]] : [side.slice(0, -1), [...centers[pile], up(side[side.length - 1])]]
  }
  const [sideOne, centerOne] = turned(0)
  const [sideTwo, centerTwo] = turned(1)
  return { ...state, sides: [sideOne, sideTwo], centers: [centerOne, centerTwo], refills, turnsWithoutPlay: state.turnsWithoutPlay + 2 }
}

/** Every card in play. Always the whole deck. */
export function cardCount(state: SpeedState): number {
  const handCards = (player: PlayerIndex) => handOf(state, player).filter(Boolean).length
  return handCards(1) + handCards(2) + state.draws[0].length + state.draws[1].length + state.sides[0].length + state.sides[1].length + state.centers[0].length + state.centers[1].length
}
