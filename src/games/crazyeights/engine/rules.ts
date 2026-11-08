// Crazy Eights for two to four players, as pure functions over one state. Every function that changes the state returns
// a new one, or null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-06: the first player out wins; what you do when you can't play, which cards do something and
// how many you start with are the setup screen's choices, see types.ts):
// - One 52-card deck. Each player is dealt their hand a card at a time, starting with whoever plays first; the next card
//   turned up starts the discard (an 8 goes to the bottom of the stock and the next is turned instead).
// - On a turn, play a card that matches the discard's top card in suit or rank, or an 8, which goes on anything and names
//   the suit to follow. A card that doesn't fit can't be played. With nothing to play, draw (until a card fits, one
//   card, or up to three); a drawn card that fits is played, and if none does the turn passes. Nobody draws while they
//   have a card to play. When the stock runs out, the discard but its top card is shuffled into a new one.
// - With 2s on, a 2 makes the next player draw two and lose their turn. With the action cards, a Queen skips the next
//   player and an Ace turns play the other way (with two players, an Ace is another turn for whoever played it).
// - The first to play their last card wins. If nobody can play or draw for a whole round, the fewest cards win.

import { type Card, type Suit } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'

import { type EightsRules, type EightsState, type EightsTurn } from './types'

/** The cards each player is dealt. */
export function handSizeFor(rules: EightsRules, players: number): number {
  if (rules.hand === 'seven') return 7
  if (rules.hand === 'five') return 5
  return players === 2 ? 7 : 5
}

/** How many cards a player may draw in a turn before it passes. */
export function drawLimit(rules: EightsRules): number {
  return rules.draw === 'one' ? 1 : rules.draw === 'three' ? 3 : Infinity
}

function shuffleSeed(seed: number, reshuffle: number): number {
  return (seed + Math.imul(reshuffle + 1, 0x9e3779b1)) >>> 0
}

const replace = <T>(list: readonly T[], index: number, value: T): T[] => list.map((item, i) => (i === index ? value : item))

/** A new game for `players` players, `first` playing first. */
export function createEightsMatch(seed: number, players: number, rules: EightsRules, first = 0): EightsState {
  const deck = shuffle(makeDeck(0), mulberry32(seed))
  const size = handSizeFor(rules, players)
  // A card's `faceUp` is whether it lies face up where it is: in hand (the table hides the others'), on the discard,
  // never in the stock.
  const hands: Card[][] = Array.from({ length: players }, () => [])
  for (let i = 0; i < size * players; i++) hands[(first + i) % players].push({ ...deck[i], faceUp: true })
  const stock = deck.slice(size * players)
  let starter = stock.pop()!
  while (starter.rank === 8) {
    stock.unshift(starter)
    starter = stock.pop()!
  }
  return { players, rules, hands, stock, discard: [{ ...starter, faceUp: true }], suit: starter.suit, phase: 'play', turn: first, direction: 1, drawn: 0, turns: [], passes: 0, first, winners: null, reshuffles: 0, seed }
}

/** The next game: the next player plays first. */
export function rematch(state: EightsState, seed: number, rules: EightsRules = state.rules): EightsState {
  return createEightsMatch(seed, state.players, rules, (state.first + 1) % state.players)
}

/** Whose move it is, or null once the game is over. */
export function toMove(state: EightsState): number | null {
  return state.phase === 'over' ? null : state.turn
}

export function discardTop(state: EightsState): Card {
  return state.discard[state.discard.length - 1]
}

/** The seat `steps` places on from `player`, the way play goes. */
export function seatAfter(state: Pick<EightsState, 'players'>, player: number, direction: 1 | -1, steps = 1): number {
  return (((player + direction * steps) % state.players) + state.players) % state.players
}

/** Whether a card goes on the discard: an 8 on anything; otherwise the suit to follow, or the top card's rank (not on an
 * 8, whose suit is the one named). */
export function fits(state: EightsState, card: Card): boolean {
  if (card.rank === 8) return true
  const top = discardTop(state)
  return card.suit === state.suit || (top.rank !== 8 && card.rank === top.rank)
}

/** The cards in a player's hand that fit. */
export function playableCards(state: EightsState, player: number): Card[] {
  return state.hands[player].filter((card) => fits(state, card))
}

export function canPlay(state: EightsState, player: number, cardId: string): boolean {
  if (state.phase !== 'play' || state.turn !== player) return false
  const card = state.hands[player].find((c) => c.id === cardId)
  return !!card && fits(state, card)
}

/** Whether any card is left to draw: the stock, or the discard under its top card. */
function cardsToDraw(state: EightsState): number {
  return state.stock.length + state.discard.length - 1
}

/** Whether the player may draw: it's their turn, no card in hand fits, they haven't drawn their limit, and there's a
 * card to draw. */
export function canDraw(state: EightsState, player: number): boolean {
  return state.phase === 'play' && state.turn === player && playableCards(state, player).length === 0 && state.drawn < drawLimit(state.rules) && cardsToDraw(state) > 0
}

/** Whether the player's turn passes: no card fits and they can't draw any more. */
export function canPass(state: EightsState, player: number): boolean {
  return state.phase === 'play' && state.turn === player && playableCards(state, player).length === 0 && !canDraw(state, player)
}

/** Takes up to `count` cards off the stock, face up, shuffling the discard but its top card into a new stock when it
 * runs out. */
function takeCards(state: EightsState, count: number): { cards: Card[]; stock: Card[]; discard: Card[]; reshuffles: number } {
  let { stock, discard, reshuffles } = state
  const cards: Card[] = []
  while (cards.length < count) {
    if (stock.length === 0) {
      if (discard.length <= 1) break
      stock = shuffle(
        discard.slice(0, -1).map((card) => ({ ...card, faceUp: false })),
        mulberry32(shuffleSeed(state.seed, reshuffles))
      )
      discard = discard.slice(-1)
      reshuffles++
    }
    cards.push({ ...stock[stock.length - 1], faceUp: true })
    stock = stock.slice(0, -1)
  }
  return { cards, stock, discard, reshuffles }
}

/** Draws one card. */
export function draw(state: EightsState, player: number): EightsState | null {
  if (!canDraw(state, player)) return null
  const { cards, stock, discard, reshuffles } = takeCards(state, 1)
  return { ...state, hands: replace(state.hands, player, [...state.hands[player], ...cards]), stock, discard, reshuffles, drawn: state.drawn + 1, passes: 0 }
}

/** Plays a card. An 8 that isn't the last card waits for its suit (nameSuit); anything else ends the turn. */
export function play(state: EightsState, player: number, cardId: string): EightsState | null {
  if (!canPlay(state, player, cardId)) return null
  const card = state.hands[player].find((c) => c.id === cardId)!
  const hand = state.hands[player].filter((c) => c.id !== cardId)
  const next: EightsState = { ...state, hands: replace(state.hands, player, hand), discard: [...state.discard, { ...card, faceUp: true }], passes: 0 }
  // An 8 leaves the suit as it was until the suit it names.
  if (card.rank === 8 && hand.length > 0) return { ...next, phase: 'suit' }
  return endTurn({ ...next, suit: card.suit }, player, card, null, state.suit)
}

/** Names the suit to follow after an 8. */
export function nameSuit(state: EightsState, player: number, suit: Suit): EightsState | null {
  if (state.phase !== 'suit' || state.turn !== player) return null
  return endTurn({ ...state, suit }, player, discardTop(state), suit, state.suit)
}

/** Passes a turn on which no card fits and no more can be drawn. Once everyone in a row has passed without drawing, the
 * game is over. */
export function pass(state: EightsState, player: number): EightsState | null {
  if (!canPass(state, player)) return null
  const passes = state.drawn === 0 ? state.passes + 1 : 0
  const turn: EightsTurn = { player, facing: state.suit, drew: state.drawn, played: null, named: null, lost: null, reversed: false, out: false }
  const next: EightsState = { ...state, turns: [...state.turns, turn], passes, drawn: 0, turn: seatAfter(state, player, state.direction) }
  if (passes < state.players) return next
  const fewest = Math.min(...state.hands.map((hand) => hand.length))
  return { ...next, phase: 'over', winners: state.hands.flatMap((hand, i) => (hand.length === fewest ? [i] : [])) }
}

/** The end of a turn on which `played` was played: going out ends the game; otherwise the card's effect on the next
 * player, and the turn moves on. */
function endTurn(state: EightsState, player: number, played: Card, named: Suit | null, facing: Suit): EightsState {
  const out = state.hands[player].length === 0
  const turn: EightsTurn = { player, facing, drew: state.drawn, played, named, lost: null, reversed: false, out }
  const base: EightsState = { ...state, phase: 'play', drawn: 0 }
  if (out) return { ...base, phase: 'over', turns: [...state.turns, turn], winners: [player] }

  const { specials } = state.rules
  let { direction } = state
  const turns = [turn]
  let next = seatAfter(state, player, direction)
  if (played.rank === 2 && specials !== 'eights') {
    const victim = next
    const taken = takeCards(base, 2)
    turns.push({ player: victim, facing: state.suit, drew: taken.cards.length, played: null, named: null, lost: 'drawTwo', reversed: false, out: false })
    return { ...base, hands: replace(base.hands, victim, [...base.hands[victim], ...taken.cards]), stock: taken.stock, discard: taken.discard, reshuffles: taken.reshuffles, turns: [...state.turns, ...turns], turn: seatAfter(state, victim, direction) }
  }
  if (played.rank === 12 && specials === 'action') {
    turns.push({ player: next, facing: state.suit, drew: 0, played: null, named: null, lost: 'skip', reversed: false, out: false })
    next = seatAfter(state, next, direction)
  } else if (played.rank === 1 && specials === 'action') {
    direction = direction === 1 ? -1 : 1
    turn.reversed = true
    // With two players, the other way round is the same player: the Ace is another turn.
    next = state.players === 2 ? player : seatAfter(state, player, direction)
  }
  return { ...base, direction, turns: [...state.turns, ...turns], turn: next }
}

/** Every card in play: always 52. */
export function cardCount(state: EightsState): number {
  return state.hands.reduce((sum, hand) => sum + hand.length, 0) + state.stock.length + state.discard.length
}
