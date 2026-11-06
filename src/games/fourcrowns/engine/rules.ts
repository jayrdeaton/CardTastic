// Four Crowns for two to four players, as pure functions over one state. Every function that changes the state returns
// a new one, or null for a move the rules don't allow.
//
// The rules (Jay, 2026-11-06: the family's own game, rummy with a wild that changes every round, played with two
// ordinary decks):
// - Two decks: 104 cards, or with four jokers, or without their Aces and 2s and with the jokers (the deck is the setup
//   screen's choice, as are what face cards cost and whether everyone gets a last turn; see types.ts). Eleven rounds: the first deals 3 cards each and each round one more, to 13 in the last. The
//   rank equal to the cards dealt is wild that round: 3s in the first, then 4s, up to Jacks, Queens and Kings. A joker
//   is always wild.
// - The next card turned up starts the discard. On a turn, draw the stock's top card or take the discard's, then throw
//   one (not the one just taken from the discard). When the stock runs out, the discard but its top card is shuffled
//   into a new one.
// - Melds are books (three or more of a rank) and runs (three or more of a suit in a row, Aces low); wilds stand in for
//   anything. A player who can meld every card but the one they throw goes out with it. Everyone else then has one last
//   turn (or none), and the round ends.
// - Each card left out of a meld scores against you: Aces 1, number cards their number, J 11, Q 12, K 13 (or 10 each),
//   a wild 20, a joker 50.
//   Melding every card scores 0. After the eleventh round the lowest total wins (a tie shares it).
// - The dealer moves one seat on each round, and the player after the dealer plays first.

import { type AnyCard, type Joker } from '@tastic/cards'

import { makeDeck } from '@/engine/deck'
import { mulberry32, shuffle } from '@/engine/rng'

import { bestArrangement, pointsWithout } from './melds'
import { type CrownsRules, type CrownsState, type CrownsTurn, DEFAULT_CROWNS_RULES, FIRST_HAND_SIZE, ROUNDS } from './types'

/** The cards each player is dealt in a round. */
export function handSizeFor(round: number): number {
  return FIRST_HAND_SIZE + round - 1
}

/** The rank that's wild in a round: the number of cards dealt (Jack 11, Queen 12, King 13). */
export function wildRankFor(round: number): number {
  return handSizeFor(round)
}

export function wildRank(state: CrownsState): number {
  return wildRankFor(state.round)
}

function roundSeed(seed: number, round: number, reshuffle: number): number {
  return (seed + Math.imul(round * 64 + reshuffle, 0x9e3779b1)) >>> 0
}

const replace = <T>(list: readonly T[], index: number, value: T): T[] => list.map((item, i) => (i === index ? value : item))

/** The cards the rules play with: two decks, with four jokers (two red, two black), or with the jokers and without the
 * Aces and 2s. */
export function crownsDeck(rules: CrownsRules): AnyCard[] {
  const decks: AnyCard[] = [...makeDeck(0), ...makeDeck(1)]
  if (rules.deck === 'plain') return decks
  const jokers: Joker[] = [0, 1].flatMap((deck) => [0, 1].map((ink): Joker => ({ id: `joker-${deck}-${ink}`, suit: 'joker', rank: null, faceUp: false })))
  return [...(rules.deck === 'short' ? decks.filter((card) => card.rank !== null && card.rank >= 3) : decks), ...jokers]
}

/** Deals a round: a card at a time from the player after the dealer, the next turned up as the first discard. */
function dealRound(base: Pick<CrownsState, 'players' | 'rules' | 'round' | 'dealer' | 'totals' | 'history' | 'outs' | 'seed'>): CrownsState {
  const deck = shuffle(crownsDeck(base.rules), mulberry32(roundSeed(base.seed, base.round, 0)))
  const size = handSizeFor(base.round)
  const first = (base.dealer + 1) % base.players
  // A card's `faceUp` is whether it lies face up where it is: in hand (the table hides the others'), on the discard,
  // never in the stock.
  const hands: AnyCard[][] = Array.from({ length: base.players }, () => [])
  for (let i = 0; i < size * base.players; i++) hands[(first + i) % base.players].push({ ...deck[i], faceUp: true })
  const stock = deck.slice(size * base.players)
  const upcard = stock.pop()!
  return { ...base, hands, stock, discard: [{ ...upcard, faceUp: true }], phase: 'draw', turn: first, taken: null, out: null, lastTurns: [], turns: [], result: null, reshuffles: 0, winners: null }
}

/** A new match for `players` players, `firstPlayer` playing first (the dealer sits before them). */
export function createCrownsMatch(seed: number, players: number, firstPlayer = 0, rules: CrownsRules = DEFAULT_CROWNS_RULES): CrownsState {
  return dealRound({ players, rules, round: 1, dealer: (firstPlayer + players - 1) % players, totals: Array(players).fill(0), history: [], outs: Array(players).fill(0), seed })
}

/** The next round, the deal moved on a seat. */
export function nextRound(state: CrownsState): CrownsState | null {
  if (state.phase !== 'roundOver') return null
  return dealRound({ players: state.players, rules: state.rules, round: state.round + 1, dealer: (state.dealer + 1) % state.players, totals: state.totals, history: state.history, outs: state.outs, seed: state.seed })
}

/** Whose move it is, or null between rounds. */
export function toMove(state: CrownsState): number | null {
  return state.phase === 'draw' || state.phase === 'discard' ? state.turn : null
}

export function discardTop(state: CrownsState): AnyCard | null {
  return state.discard[state.discard.length - 1] ?? null
}

export function canDrawStock(state: CrownsState, player: number): boolean {
  return state.phase === 'draw' && state.turn === player && state.stock.length + state.discard.length > 1
}

export function canTakeDiscard(state: CrownsState, player: number): boolean {
  return state.phase === 'draw' && state.turn === player && state.discard.length > 0
}

export function takeDiscard(state: CrownsState, player: number): CrownsState | null {
  if (!canTakeDiscard(state, player)) return null
  const card = discardTop(state)!
  return { ...state, hands: replace(state.hands, player, [...state.hands[player], card]), discard: state.discard.slice(0, -1), phase: 'discard', taken: card }
}

/** Draws the stock's top card; an empty stock is first made again from the discard, but its top card, shuffled. */
export function drawStock(state: CrownsState, player: number): CrownsState | null {
  if (!canDrawStock(state, player)) return null
  let { stock, discard, reshuffles } = state
  if (stock.length === 0) {
    reshuffles++
    stock = shuffle(
      discard.slice(0, -1).map((card) => ({ ...card, faceUp: false })),
      mulberry32(roundSeed(state.seed, state.round, reshuffles))
    )
    discard = discard.slice(-1)
  }
  const card = stock[stock.length - 1]
  return { ...state, hands: replace(state.hands, player, [...state.hands[player], { ...card, faceUp: true }]), stock: stock.slice(0, -1), discard, reshuffles, phase: 'discard', taken: null }
}

/** Whether the card can be thrown: not the one just taken from the discard. */
export function canThrow(state: CrownsState, player: number, cardId: string): boolean {
  return state.phase === 'discard' && state.turn === player && state.taken?.id !== cardId && state.hands[player].some((card) => card.id === cardId)
}

/** The points the player would have in hand after throwing the card. */
export function pointsAfterThrow(state: CrownsState, player: number, cardId: string): number {
  return pointsWithout(state.hands[player], cardId, wildRank(state), state.rules.faces)
}

/** Whether the player can go out throwing this card: nobody has yet, and every other card melds. */
export function canGoOut(state: CrownsState, player: number, cardId: string): boolean {
  return state.out === null && canThrow(state, player, cardId) && pointsAfterThrow(state, player, cardId) === 0
}

function thrown(state: CrownsState, player: number, cardId: string, wentOut: boolean): CrownsState {
  const card = state.hands[player].find((c) => c.id === cardId)!
  const turn: CrownsTurn = { player, took: state.taken ? 'discard' : 'stock', card: state.taken, threw: card, wentOut }
  return {
    ...state,
    hands: replace(
      state.hands,
      player,
      state.hands[player].filter((c) => c.id !== cardId)
    ),
    discard: [...state.discard, card],
    taken: null,
    turns: [...state.turns, turn]
  }
}

/** Throws a card, ending the turn; on the last of the last turns, ending the round. */
export function throwCard(state: CrownsState, player: number, cardId: string): CrownsState | null {
  if (!canThrow(state, player, cardId)) return null
  const next = thrown(state, player, cardId, false)
  if (state.out === null) return { ...next, phase: 'draw', turn: (player + 1) % state.players }
  const lastTurns = state.lastTurns.slice(1)
  if (lastTurns.length === 0) return endRound({ ...next, lastTurns })
  return { ...next, lastTurns, phase: 'draw', turn: lastTurns[0] }
}

/** Goes out, throwing the card: everyone else, in turn, has one last turn (or the round ends at once). */
export function goOut(state: CrownsState, player: number, cardId: string): CrownsState | null {
  if (!canGoOut(state, player, cardId)) return null
  const next = thrown(state, player, cardId, true)
  if (state.rules.lastTurns === 'none') return endRound({ ...next, out: player, lastTurns: [] })
  const lastTurns = Array.from({ length: state.players - 1 }, (_, k) => (player + 1 + k) % state.players)
  return { ...next, out: player, lastTurns, phase: 'draw', turn: lastTurns[0] }
}

/** Every hand laid down and scored; after the last round, the lowest total wins. */
function endRound(state: CrownsState): CrownsState {
  const rank = wildRank(state)
  const shown = state.hands.map((hand) => bestArrangement(hand, rank, state.rules.faces))
  const points = shown.map((arrangement) => arrangement.points)
  const totals = state.totals.map((total, i) => total + points[i])
  const result = { out: state.out!, shown, points }
  const outs = state.outs.map((count, i) => (i === state.out ? count + 1 : count))
  const history = [...state.history, points]
  if (state.round < ROUNDS) return { ...state, phase: 'roundOver', result, totals, history, outs }
  const low = Math.min(...totals)
  const winners = totals.flatMap((total, i) => (total === low ? [i] : []))
  return { ...state, phase: 'matchOver', result, totals, history, outs, winners }
}

/** Every card in play: always the whole deck the rules play with. */
export function cardCount(state: CrownsState): number {
  return state.hands.reduce((sum, hand) => sum + hand.length, 0) + state.stock.length + state.discard.length
}
