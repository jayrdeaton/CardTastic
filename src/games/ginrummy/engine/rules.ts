// Gin Rummy for two players, as pure functions over one state. Every function that changes the state returns a new
// one, or null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-06: knock at 10 or less, gin and undercut worth 25, a match to 100 or 50):
// - Ten cards each; the next card turned up starts the discard. The non-dealer may take that first upcard or pass; if
//   they pass, the dealer may; if both pass, the non-dealer draws from the stock.
// - On a turn, draw the stock's top card or take the discard's, then throw one card (not the one just taken from the
//   discard).
// - Melds are sets (three or four of a rank) and runs (three or more of a suit in a row, Aces low). Cards in no meld are
//   deadwood: Aces 1, number cards their number, face cards 10.
// - Instead of throwing, a player whose deadwood after their throw is 10 or less may knock. With no deadwood, that's
//   gin. The other player lays down their melds and, unless it's gin, lays off what they can on the knocker's.
// - The knocker scores the difference in deadwood. Gin scores the other player's deadwood plus 25. A defender at or
//   under the knocker's deadwood undercuts them, and scores the difference plus 25.
// - If the stock is down to two cards and the player who drew throws without knocking, the hand is a draw.
// - The first to the target wins the match. The winner of a hand deals the next, so its loser plays first; after a
//   draw the same player deals again.

import { type Card } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'
import { otherPlayer } from '@/games/table/players'

import { bestArrangement, bestDefence, deadwoodWithout, type DefenderArrangement } from './melds'
import { GIN_BONUS, type GinHandResult, type GinState, type GinTarget, HAND_SIZE, KNOCK_LIMIT, type PlayerIndex, STOCK_LEFT_FOR_WASH, UNDERCUT_BONUS } from './types'

export function handOf(state: GinState, player: PlayerIndex): Card[] {
  return state.hands[player - 1]
}

function withHand(hands: [Card[], Card[]], player: PlayerIndex, hand: Card[]): [Card[], Card[]] {
  return player === 1 ? [hand, hands[1]] : [hands[0], hand]
}

function plusOne(pair: [number, number], player: PlayerIndex | null, by = 1): [number, number] {
  if (player === null) return pair
  return player === 1 ? [pair[0] + by, pair[1]] : [pair[0], pair[1] + by]
}

function handSeed(seed: number, hand: number): number {
  return (seed + Math.imul(hand, 0x9e3779b1)) >>> 0
}

/** Deals a hand: ten each, a card at a time from the non-dealer, the next turned up as the first upcard. */
function dealHand(base: Omit<GinState, 'hands' | 'stock' | 'discard' | 'phase' | 'turn' | 'upcardPassed' | 'stockOnly' | 'drawnFrom' | 'taken' | 'pickups' | 'lastTurn' | 'result'>): GinState {
  const deck = shuffle(makeDeck(), mulberry32(handSeed(base.seed, base.hand)))
  const nonDealer = otherPlayer(base.dealer)
  // A card's `faceUp` is whether it lies face up where it is: in hand (the table hides the other player's), on the
  // discard (all but a knocking card), never in the stock.
  const first: Card[] = []
  const second: Card[] = []
  for (let i = 0; i < HAND_SIZE * 2; i++) (i % 2 === 0 ? first : second).push({ ...deck[i], faceUp: true })
  const hands: [Card[], Card[]] = nonDealer === 1 ? [first, second] : [second, first]
  const stock = deck.slice(HAND_SIZE * 2)
  const upcard = stock.pop()!
  return { ...base, hands, stock, discard: [{ ...upcard, faceUp: true }], phase: 'upcard', turn: nonDealer, upcardPassed: false, stockOnly: false, drawnFrom: null, taken: null, pickups: [[], []], lastTurn: null, result: null }
}

/** A new match. Seat 2 deals the first hand, so seat 1 plays first; a rematch passes the loser of the last match. */
export function createGinMatch(seed: number, target: GinTarget = 100, firstPlayer: PlayerIndex = 1): GinState {
  return dealHand({ target, dealer: otherPlayer(firstPlayer), scores: [0, 0], handsWon: [0, 0], gins: [0, 0], undercuts: [0, 0], winner: null, hand: 1, seed })
}

/** The next hand, dealt by the last one's winner (the same dealer after a draw). */
export function nextHand(state: GinState): GinState | null {
  if (state.phase !== 'handOver' || !state.result) return null
  const { target, scores, handsWon, gins, undercuts, seed } = state
  return dealHand({ target, dealer: state.result.scorer ?? state.dealer, scores, handsWon, gins, undercuts, winner: null, hand: state.hand + 1, seed })
}

/** Whose move it is, or null between hands. */
export function toMove(state: GinState): PlayerIndex | null {
  return state.phase === 'upcard' || state.phase === 'draw' || state.phase === 'discard' ? state.turn : null
}

/** The discard's top card. */
export function discardTop(state: GinState): Card | null {
  return state.discard[state.discard.length - 1] ?? null
}

/** Whether the player may take the discard's top card now: the upcard on their offer, or on an ordinary draw. */
export function canTakeDiscard(state: GinState, player: PlayerIndex): boolean {
  if (state.turn !== player || state.discard.length === 0) return false
  return state.phase === 'upcard' || (state.phase === 'draw' && !state.stockOnly)
}

export function canDrawStock(state: GinState, player: PlayerIndex): boolean {
  return state.turn === player && state.phase === 'draw' && state.stock.length > 0
}

export function takeDiscard(state: GinState, player: PlayerIndex): GinState | null {
  if (!canTakeDiscard(state, player)) return null
  const card = discardTop(state)!
  return { ...state, hands: withHand(state.hands, player, [...handOf(state, player), card]), discard: state.discard.slice(0, -1), phase: 'discard', drawnFrom: 'discard', taken: card, pickups: withHand(state.pickups, player, [...state.pickups[player - 1], card]) }
}

/** Passes on the first upcard: the dealer is offered it next, and if they pass too the non-dealer draws from the stock. */
export function passUpcard(state: GinState, player: PlayerIndex): GinState | null {
  if (state.phase !== 'upcard' || state.turn !== player) return null
  const lastTurn = { player, took: 'pass' as const, card: discardTop(state), threw: null }
  if (!state.upcardPassed) return { ...state, turn: otherPlayer(player), upcardPassed: true, lastTurn }
  return { ...state, phase: 'draw', turn: otherPlayer(player), stockOnly: true, lastTurn }
}

export function drawStock(state: GinState, player: PlayerIndex): GinState | null {
  if (!canDrawStock(state, player)) return null
  const card = state.stock[state.stock.length - 1]
  return { ...state, hands: withHand(state.hands, player, [...handOf(state, player), { ...card, faceUp: true }]), stock: state.stock.slice(0, -1), phase: 'discard', drawnFrom: 'stock', taken: null }
}

/** Whether the card can be thrown: not the one just taken from the discard. */
export function canThrow(state: GinState, player: PlayerIndex, cardId: string): boolean {
  return state.phase === 'discard' && state.turn === player && state.taken?.id !== cardId && handOf(state, player).some((card) => card.id === cardId)
}

/** The deadwood the player would have after throwing the card. */
export function deadwoodAfterThrow(state: GinState, player: PlayerIndex, cardId: string): number {
  return deadwoodWithout(handOf(state, player), cardId)
}

/** Whether the player may knock throwing this card: their deadwood after it is the knock limit or less. */
export function canKnock(state: GinState, player: PlayerIndex, cardId: string): boolean {
  return canThrow(state, player, cardId) && deadwoodAfterThrow(state, player, cardId) <= KNOCK_LIMIT
}

/** Throws a card, ending the turn: or the hand, a draw, if the stock is down to its last two cards. */
export function throwCard(state: GinState, player: PlayerIndex, cardId: string): GinState | null {
  if (!canThrow(state, player, cardId)) return null
  const card = handOf(state, player).find((c) => c.id === cardId)!
  const thrown = {
    ...state,
    hands: withHand(
      state.hands,
      player,
      handOf(state, player).filter((c) => c.id !== cardId)
    ),
    discard: [...state.discard, card],
    drawnFrom: null,
    taken: null,
    stockOnly: false,
    lastTurn: { player, took: state.drawnFrom ?? 'stock', card: state.taken, threw: card }
  }
  if (state.stock.length <= STOCK_LEFT_FOR_WASH) return { ...thrown, phase: 'handOver', result: { ending: 'wash', knocker: null, scorer: null, points: 0, shown: null } }
  return { ...thrown, phase: 'draw', turn: otherPlayer(player) }
}

/** Knocks, throwing the card face down: both hands are laid down, the defender lays off unless it's gin, and the hand is
 * scored. Reaching the target ends the match. */
export function knock(state: GinState, player: PlayerIndex, cardId: string): GinState | null {
  if (!canKnock(state, player, cardId)) return null
  const card = handOf(state, player).find((c) => c.id === cardId)!
  const knockerCards = handOf(state, player).filter((c) => c.id !== cardId)
  const defender = otherPlayer(player)
  const knocker: DefenderArrangement = { ...bestArrangement(knockerCards), laidOff: [] }
  const gin = knocker.points === 0
  const defence: DefenderArrangement = gin ? { ...bestArrangement(handOf(state, defender)), laidOff: [] } : bestDefence(handOf(state, defender), knocker.melds)
  let result: GinHandResult
  const shown: [DefenderArrangement, DefenderArrangement] = player === 1 ? [knocker, defence] : [defence, knocker]
  if (gin) result = { ending: 'gin', knocker: player, scorer: player, points: defence.points + GIN_BONUS, shown }
  else if (defence.points <= knocker.points) result = { ending: 'undercut', knocker: player, scorer: defender, points: knocker.points - defence.points + UNDERCUT_BONUS, shown }
  else result = { ending: 'knock', knocker: player, scorer: player, points: defence.points - knocker.points, shown }
  const scores = plusOne(state.scores, result.scorer, result.points)
  const winner = result.scorer !== null && scores[result.scorer - 1] >= state.target ? result.scorer : null
  return {
    ...state,
    hands: withHand(state.hands, player, knockerCards),
    discard: [...state.discard, { ...card, faceUp: false }],
    drawnFrom: null,
    taken: null,
    lastTurn: { player, took: state.drawnFrom ?? 'stock', card: state.taken, threw: card },
    result,
    scores,
    handsWon: plusOne(state.handsWon, result.scorer),
    gins: result.ending === 'gin' ? plusOne(state.gins, player) : state.gins,
    undercuts: result.ending === 'undercut' ? plusOne(state.undercuts, defender) : state.undercuts,
    winner,
    phase: winner ? 'matchOver' : 'handOver'
  }
}

/** Every card in play. Always the whole deck. */
export function cardCount(state: GinState): number {
  return state.hands[0].length + state.hands[1].length + state.stock.length + state.discard.length
}
