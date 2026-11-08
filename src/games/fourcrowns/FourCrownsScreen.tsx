// Four Crowns' table, drawn upright for whoever's turn it is (layout.ts): their hand across the bottom, arranged into
// its melds (each with a line under it) and then the rest, every wild marked with a crown; each other player in a slot
// across the top, their hand a fan of backs; and the stock and the discard between, with the round and its wild rank
// under them. With one person and CPUs, seat 1 always sits at the bottom. With more people the phone is passed: when the
// turn goes to another person, every hand turns face down and the pass cover (games/table/PassCover.tsx) says who to
// hand it to and what was played since their last turn; Ready shows them their hand. Once a round is over the piles are
// swept away and every hand is laid face up, with what it scored, until someone taps Next Round. Every card is one view
// the whole time it's on the table (games/table/TableCards.tsx), so a card visibly goes from the stock to a hand to the
// discard.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { useKeepAwake } from '@rific/core'
import { type AnyCard, CardSizeProvider } from '@tastic/cards'
import { useOverlayCardColors } from '@tastic/hud/chrome'
import { useActiveRound } from '@tastic/shell'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { useMotionReduced } from '@/components/reducedMotion'
import { SettingsDialog } from '@/components/SettingsDialog'
import { CHROME_FG, CHROME_FG_MUTED } from '@/components/theme'
import { useCardSoundEffects } from '@/components/useCardSounds'
import { PipFireworks } from '@/components/winning/PipFireworks'
import { type CpuLevel } from '@/games/table/cpuLevel'
import { type TablePlayer, tablePlayers } from '@/games/table/extraSeats'
import { cardTilt, type Pose } from '@/games/table/geometry'
import { ActionRow, cardName, type HandAction, type HandGroup, handRowPoses, HandSuitMarks, type MeldLine, MeldLines, suitMarkSpots } from '@/games/table/HandRow'
import { PassCover } from '@/games/table/PassCover'
import { VS_CPU_HUMANS } from '@/games/table/players'
import { type TableCardSpec } from '@/games/table/TableCards'
import { SeatBadge, type TableCardContent, TableOverlay, useAppActive, useTableSeats } from '@/games/table/TableChrome'
import { type TableLabel, type TableTarget, TableView } from '@/games/table/TableView'
import { useNextRound } from '@/games/table/useNextRound'
import { useSettled, useTableSize } from '@/games/table/useTable'
import { useSettings } from '@/hooks/useSettings'
import { type MatchSeatResult, matchStatsActions } from '@/redux/matchStatsSlice'

import { bestArrangement, isWild } from './engine/melds'
import { canDrawStock, canGoOut, canTakeDiscard, canThrow, discardTop, handSizeFor, pointsAfterThrow, toMove, wildRank } from './engine/rules'
import { type CrownsState, type CrownsTurn, ROUNDS } from './engine/types'
import { type CrownsLayout, crownsLayout, fanPoses } from './layout'
import { CROWNS_RULE_KEYS } from './ruleSettings'
import { type CrownsRoundSettings, crownsRules } from './useCrownsLoadout'
import { useCrownsMatch } from './useCrownsMatch'

/** A card's move between two places. */
const MOVE_MS = 300
/** The deal: a card every this often, round the table, then the upcard; quicker for a long deal so it takes about this. */
const DEAL_STAGGER_MS = 45
const DEAL_MOST_MS = 1800
/** The last round's hands lie face up this long before the match's result shows. */
const RESULT_MS = 2200
/** How many of the stock's and the discard's top cards are drawn. */
const PILE_DRAWN = 3
const WILD_BADGE = 18

type CrownsPlayer = TablePlayer

export function FourCrownsScreen() {
  useKeepAwake('game')
  const { settings } = useSettings()
  const dispatch = useDispatch()
  const { dark } = useAutoPaperTheme()
  const { width, height, onLayout } = useTableSize()
  const insets = useSafeAreaInsets()
  const reduceMotion = useMotionReduced()
  const { playCardSound, hapticCard } = useCardSoundEffects()

  // The round the setup screen committed (seat 2, seats 3 and 4, the CPUs' level, the rules); a direct link plays the
  // player's own settings, seat 2 the CPU.
  const { mode, settings: round } = useActiveRound<CrownsRoundSettings>('fourcrowns', { crownsCpu: settings.crownsCpu, crownsSeat3: settings.crownsSeat3, crownsSeat4: settings.crownsSeat4, crownsDeck: settings.crownsDeck, crownsFaces: settings.crownsFaces, crownsLastTurns: settings.crownsLastTurns })
  const seat2Person = mode === 'twoPlayer'
  const { seats, statsIds } = useTableSeats(seat2Person)
  const players = useMemo(() => tablePlayers(seats, seat2Person, round.crownsSeat3, round.crownsSeat4, dark), [seats, seat2Person, round.crownsSeat3, round.crownsSeat4, dark])
  const rules = useMemo(() => crownsRules(round), [round])
  const nextRound = useNextRound('fourcrowns', mode, round, CROWNS_RULE_KEYS)
  const cpus = useMemo(() => players.map((player): CpuLevel | null => (player.kind === 'cpu' ? round.crownsCpu : null)), [players, round.crownsCpu])
  const people = players.flatMap((player, i) => (player.kind === 'person' ? [i] : []))
  const passAndPlay = people.length > 1

  const [settingsOpen, setSettingsOpen] = useState(false)
  const appActive = useAppActive()

  const changed = useCallback(
    (prev: CrownsState, next: CrownsState) => {
      if (next !== prev) playCardSound()
      if (next.phase === 'matchOver' && prev.phase !== 'matchOver') {
        const winners = next.winners ?? []
        const seat = (i: number, player: string | null): MatchSeatResult => ({ player, outcome: winners.includes(i) ? (winners.length > 1 ? 'tied' : 'won') : 'lost', counts: { outs: next.outs[i] }, lows: { bestTotal: next.totals[i] } })
        // Against CPUs alone it's a match against the CPU at their level; with another person at the table, against people.
        const cpuOnly = players.slice(1).every((player) => player.kind === 'cpu')
        dispatch(matchStatsActions.recordMatch({ game: 'fourcrowns', cpu: cpuOnly ? round.crownsCpu : null, seats: seat2Person ? [seat(0, statsIds[1]), seat(1, statsIds[2])] : [seat(0, statsIds[1])] }))
      }
    },
    [playCardSound, players, dispatch, round.crownsCpu, seat2Person, statsIds]
  )

  const dealMs = useCallback((current: CrownsState) => (reduceMotion ? 0 : dealCount(current) * dealStagger(current) + MOVE_MS + 100), [reduceMotion])
  const match = useCrownsMatch({ cpus, rules, paused: settingsOpen || !appActive, dealMs, changed })
  const { state, dealt } = match
  const roundEnded = state.phase === 'roundOver' || state.phase === 'matchOver'
  const resultShown = useSettled(state.phase === 'matchOver' ? match.deal : null, reduceMotion ? 300 : RESULT_MS)

  // Who has the phone: they've tapped Ready on the pass cover (seat 1 starts with it). The table is drawn for whoever's
  // turn it is, or whoever has the phone while a CPU plays, so when the turn passes to another person the table turns to
  // them at once, under the cover, every hand face down; it's theirs once they tap Ready.
  const [holder, setHolder] = useState(0)
  const moving = toMove(state)
  const movingPerson = moving !== null && players[moving].kind === 'person'
  const seated = passAndPlay && movingPerson ? moving : passAndPlay ? holder : 0
  const covered = passAndPlay && movingPerson && moving !== holder
  const layout = useMemo(() => crownsLayout(width, height, insets, players.length), [width, height, insets, players.length])
  const others = useMemo(() => Array.from({ length: players.length - 1 }, (_, k) => (seated + 1 + k) % players.length), [seated, players.length])

  // The card picked to throw, for this state only: any move drops it.
  const [pick, setPick] = useState<{ state: CrownsState; cardId: string } | null>(null)
  const picked = pick?.state === state ? pick.cardId : null
  const yourMove = !covered && dealt && !settingsOpen && moving === seated

  const act = useCallback(
    (done: boolean) => {
      if (done) hapticCard()
    },
    [hapticCard]
  )

  const { cards, lines, wilds } = useMemo(() => crownsCards(state, layout, seated, others, covered, picked, !dealt, reduceMotion), [state, layout, seated, others, covered, picked, dealt, reduceMotion])

  const targets: TableTarget[] = []
  if (yourMove && state.phase === 'draw') {
    if (canDrawStock(state, seated)) targets.push({ key: 'stock', at: layout.stock, label: 'Draw from the stock', onPress: () => act(match.draw(seated)) })
    if (canTakeDiscard(state, seated)) targets.push({ key: 'discard', at: layout.discard, label: `Take the ${cardName(discardTop(state)!)}`, onPress: () => act(match.take(seated)) })
  }
  if (yourMove && state.phase === 'discard') {
    // Left to right as the hand is laid out, so each card's target lies over the one before it, as the cards do: a tap
    // on the strip of a card that shows goes to that card.
    const inHand = new Map(state.hands[seated].map((card) => [card.id, card]))
    for (const { card: drawn, pose } of cards) {
      const card = inHand.get(drawn.id)
      if (!card) continue
      targets.push({ key: `card-${card.id}`, at: pose, label: picked === card.id ? `Put back the ${cardName(card)}` : `Pick the ${cardName(card)}`, glow: false, onPress: () => setPick(picked === card.id ? null : { state, cardId: card.id }) })
    }
  }

  const name = (player: number) => (!passAndPlay && player === 0 ? 'You' : players[player].seat.name)
  const pointsNow = (player: number): number => {
    if (picked && player === seated && canThrow(state, player, picked)) return pointsAfterThrow(state, player, picked)
    return bestArrangement(state.hands[player], wildRank(state), state.rules.faces).points
  }
  const seatedLabel: TableLabel = {
    seat: players[seated].seat,
    subtitle: roundEnded && state.result ? roundScore(state, seated) : dealt && !covered ? `Deadwood ${pointsNow(seated)}` : null,
    score: `Total ${state.totals[seated]}`,
    active: moving === seated
  }
  const prompts: Partial<Record<1 | 2, string | null>> = {}
  if (roundEnded && state.result) prompts[1] = `${name(state.result.out)} went out`
  else if (dealt && !covered && moving !== null) prompts[1] = moving === seated ? promptFor(state, picked) : `${players[moving].seat.name}’s turn`

  // The buttons over the hand: Throw, and Go Out, once a card is picked; Next Round once a round is over.
  const actions: HandAction[] = []
  if (yourMove && state.phase === 'discard' && picked) {
    actions.push({ key: 'throw', label: 'Throw', primary: false, disabled: !canThrow(state, seated, picked), onPress: () => act(match.toss(seated, picked)) })
    if (canGoOut(state, seated, picked)) actions.push({ key: 'out', label: 'Go Out', primary: true, onPress: () => act(match.out(seated, picked)) })
  }
  if (state.phase === 'roundOver') actions.push({ key: 'next', label: 'Next Round', primary: true, onPress: match.nextRound })

  const winners = state.winners ?? []
  const celebrate = passAndPlay ? winners.some((i) => players[i].kind === 'person') : winners.includes(0)

  return (
    <CardSizeProvider width={layout.cardWidth}>
      <View style={styles.screen} onLayout={onLayout}>
        <TableView
          game='fourcrowns'
          layout={layout}
          cards={cards}
          dealKey={match.deal}
          targets={targets}
          labels={{ 1: seatedLabel }}
          prompts={prompts}
          notes={{}}
          call={null}
          emptySlots={[]}
          overCards={
            <>
              <MeldLines game='fourcrowns' lines={lines} />
              {dealt ? <HandSuitMarks game='fourcrowns' spots={suitMarkSpots(cards, layout.cardWidth, layout.cardHeight)} cardWidth={layout.cardWidth} /> : null}
              <WildBadges at={wilds} />
              <RoundBanner state={state} layout={layout} name={name} />
              {roundEnded ? <RowLabels state={state} layout={layout} others={others} players={players} /> : <SlotLabels state={state} layout={layout} others={others} players={players} moving={moving} />}
            </>
          }
          onSettings={() => setSettingsOpen(true)}
        >
          {actions.length > 0 ? <ActionRow game='fourcrowns' actions={actions} y={layout.actionY} /> : null}
          {covered ? <PassCover seat={players[moving!].seat} message={passMessage(state, moving!, players)} onReady={() => setHolder(moving!)} testID='fourcrowns-pass' /> : null}
          {resultShown && state.phase === 'matchOver' ? <TableOverlay humans={VS_CPU_HUMANS} content={() => matchContent(state, players, passAndPlay)} actionLabel='Rematch' onAction={() => match.rematch(crownsRules(nextRound()))} testID='fourcrowns-result' /> : null}
          {resultShown && state.phase === 'matchOver' && celebrate ? <PipFireworks /> : null}
        </TableView>
      </View>
      <SettingsDialog visible={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
    </CardSizeProvider>
  )
}

/** The cards a round's deal sends out: every hand, then the upcard. */
function dealCount(state: CrownsState): number {
  return state.players * handSizeFor(state.round) + 1
}

/** The time between one dealt card and the next: quicker for a long deal, so none takes much over DEAL_MOST_MS. */
function dealStagger(state: CrownsState): number {
  return Math.min(DEAL_STAGGER_MS, DEAL_MOST_MS / dealCount(state))
}

/** A hand's groups as it's laid out: its melds, then the rest. */
function handGroups(state: CrownsState, player: number): HandGroup[] {
  const arrangement = state.result?.shown[player] ?? bestArrangement(state.hands[player], wildRank(state), state.rules.faces)
  return [...arrangement.melds.map((meld): HandGroup => ({ cards: meld.cards, kind: 'meld' })), { cards: arrangement.loose, kind: 'loose' }]
}

/** Every card on the table, bottom to top: the stock's top cards, the discard's, the other players' hands, then the
 * seated player's. A deal sends each hand's cards out from the stock round the table, the upcard last. Also the lines
 * under the melds of every hand showing its face, and where each wild in a face-up hand shows. */
function crownsCards(state: CrownsState, layout: CrownsLayout, seated: number, others: number[], covered: boolean, picked: string | null, dealing: boolean, reduceMotion: boolean): { cards: TableCardSpec[]; lines: (MeldLine & { y: number })[]; wilds: Pose[] } {
  const move = reduceMotion ? 0 : MOVE_MS
  const stagger = dealStagger(state)
  const stockPose: Pose = { ...layout.stock, rotate: 0 }
  const roundEnded = state.phase === 'roundOver' || state.phase === 'matchOver'
  const rank = wildRank(state)
  // The order each card left the stock in the deal: round the table from the player after the dealer.
  const dealOrder = new Map<string, number>()
  for (let player = 0; player < state.players; player++) {
    const seat = (player - state.dealer - 1 + state.players * 2) % state.players
    state.hands[player].forEach((card, i) => dealOrder.set(card.id, i * state.players + seat))
  }
  const dealt = (card: AnyCard, fallback: number) => (dealing && !reduceMotion ? { from: stockPose, delayMs: (dealOrder.get(card.id) ?? fallback) * stagger } : {})

  const cards: TableCardSpec[] = []
  const lines: (MeldLine & { y: number })[] = []
  const wilds: Pose[] = []
  // Once a round is over the piles go off the table's edge.
  const stock = state.stock.slice(-PILE_DRAWN)
  stock.forEach((card, k) => {
    const depth = stock.length - 1 - k
    cards.push({ card, pose: roundEnded ? layout.sweep : { x: layout.stock.x + depth * 2.5, y: layout.stock.y + depth * 2.5, rotate: 0 }, faceUp: false, durationMs: move })
  })
  const discard = state.discard.slice(-PILE_DRAWN)
  discard.forEach((card, k) => {
    const pose: Pose = roundEnded ? layout.sweep : { ...layout.discard, rotate: cardTilt(card.id, 3) }
    cards.push({ card, pose, faceUp: true, durationMs: move, ...dealt(card, dealCount(state) - 1) })
    if (!roundEnded && k === discard.length - 1 && isWild(card, rank)) wilds.push(wildSpot(pose, layout, layout.cardWidth))
  })

  const faceUpRow = (player: number, centerY: number, lineY: number, lift: string | null) => {
    const groups = handGroups(state, player)
    const { poses, lines: rowLines } = handRowPoses(groups, { centerX: layout.width / 2, y: centerY, cardWidth: layout.cardWidth, step: layout.handStep, gap: layout.groupGap, lift: layout.lift }, lift)
    for (const group of groups)
      for (const card of group.cards) {
        const pose = poses.get(card.id)!
        cards.push({ card, pose, faceUp: true, durationMs: move, ...dealt(card, 0) })
        if (isWild(card, rank)) wilds.push(wildSpot(pose, layout, layout.handStep))
      }
    for (const line of rowLines) lines.push({ ...line, y: lineY })
  }

  others.forEach((player, k) => {
    if (roundEnded) faceUpRow(player, layout.rows[k].handY, layout.rows[k].lineY, null)
    else {
      const poses = fanPoses(state.hands[player].length, layout.slots[k], layout)
      state.hands[player].forEach((card, i) => cards.push({ card, pose: poses[i], faceUp: false, durationMs: move, ...dealt(card, 0) }))
    }
  })
  if (roundEnded || !covered) faceUpRow(seated, layout.handY, layout.meldLineY, picked)
  else {
    // Under the pass cover the seated hand lies face down, as a fan across the bottom.
    const count = state.hands[seated].length
    const span = layout.cardWidth + (count - 1) * layout.backStep
    state.hands[seated].forEach((card, i) => cards.push({ card, pose: { x: layout.width / 2 - span / 2 + layout.cardWidth / 2 + i * layout.backStep, y: layout.handY, rotate: 0 }, faceUp: false, durationMs: move, ...dealt(card, 0) }))
  }
  return { cards, lines, wilds }
}

/** Where a wild's crown sits: low on the strip of the card that shows. */
function wildSpot(pose: Pose, layout: CrownsLayout, shown: number): Pose {
  return { x: pose.x - layout.cardWidth / 2 + Math.min(shown, layout.cardWidth) / 2, y: pose.y + layout.cardHeight / 2 - WILD_BADGE / 2 - 4, rotate: 0 }
}

/** A crown on each wild showing its face, so a wild in a run reads as the card it stands in for. */
function WildBadges({ at }: { at: Pose[] }) {
  return (
    <>
      {at.map(({ x, y }) => (
        <View key={`${x}-${y}`} pointerEvents='none' style={[styles.wild, { left: x - WILD_BADGE / 2, top: y - WILD_BADGE / 2 }]} testID='fourcrowns-wild'>
          <Icon source='crown' size={12} color='#fff' />
        </View>
      ))}
    </>
  )
}

/** The rank that's wild, as the banner says it: 3s to 10s, then Jacks, Queens and Kings; with the jokers in, them too. */
export function wildLabel(rank: number, jokers = false): string {
  const ranks = rank <= 10 ? `${rank}s` : rank === 11 ? 'Jacks' : rank === 12 ? 'Queens' : 'Kings'
  return jokers ? `${ranks} and Jokers Wild` : `${ranks} Wild`
}

/** Under the piles: the round (or who went out), and the rank that's wild. */
function RoundBanner({ state, layout, name }: { state: CrownsState; layout: CrownsLayout; name: (player: number) => string }) {
  if (state.phase === 'roundOver' || state.phase === 'matchOver') return null
  return (
    <>
      <View pointerEvents='none' style={[styles.bannerLine, { top: layout.roundY - 10 }]}>
        <Text variant='labelLarge' style={styles.muted} numberOfLines={1} testID='fourcrowns-round'>
          {state.out === null ? `Round ${state.round} of ${ROUNDS}` : `${name(state.out)} went out: last turns`}
        </Text>
      </View>
      <View pointerEvents='none' style={[styles.bannerLine, { top: layout.wildY - 12 }]}>
        <Icon source='crown' size={18} color={CHROME_FG} />
        <Text variant='titleMedium' style={styles.strong} testID='fourcrowns-wild-rank'>
          {wildLabel(wildRank(state), state.rules.deck !== 'plain')}
        </Text>
      </View>
    </>
  )
}

/** Each other player's name, total, and what they took and threw last under their fan, while a round plays. */
function SlotLabels({ state, layout, others, players, moving }: { state: CrownsState; layout: CrownsLayout; others: number[]; players: CrownsPlayer[]; moving: number | null }) {
  return (
    <>
      {others.map((player, k) => {
        const slot = layout.slots[k]
        const [took, threw] = turnLines(lastTurnOf(state, player))
        return (
          <View key={player} pointerEvents='none' style={[styles.slot, { left: slot.x - slot.width / 2, top: slot.nameY - 9, width: slot.width }]} testID={`fourcrowns-slot-${player}`}>
            <View style={styles.slotName}>
              <SeatBadge seat={players[player].seat} />
              <Text variant='labelLarge' style={[styles.flexText, { color: moving === player ? CHROME_FG : CHROME_FG_MUTED }]} numberOfLines={1}>
                {players[player].seat.name}
              </Text>
            </View>
            <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
              {`Total ${state.totals[player]}`}
            </Text>
            <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
              {took}
            </Text>
            <Text variant='labelMedium' style={styles.muted} numberOfLines={1}>
              {threw}
            </Text>
          </View>
        )
      })}
    </>
  )
}

/** Each other player's name line over their hand, once a round is over: what they scored this round, and their total. */
function RowLabels({ state, layout, others, players }: { state: CrownsState; layout: CrownsLayout; others: number[]; players: CrownsPlayer[] }) {
  return (
    <>
      {others.map((player, k) => (
        <View key={player} pointerEvents='none' style={[styles.rowLabel, { top: layout.rows[k].labelY - 12 }]} testID={`fourcrowns-row-${player}`}>
          <SeatBadge seat={players[player].seat} />
          <Text variant='labelLarge' style={styles.flexText} numberOfLines={1}>
            {players[player].seat.name}
            <Text style={styles.muted}>{` · ${roundScore(state, player)}`}</Text>
          </Text>
          <Text variant='labelLarge' style={styles.muted}>{`Total ${state.totals[player]}`}</Text>
        </View>
      ))}
    </>
  )
}

/** What a player scored in the round just over: going out (first) shows as that. */
function roundScore(state: CrownsState, player: number): string {
  if (!state.result) return ''
  if (state.result.out === player) return 'Went out'
  return `+${state.result.points[player]}`
}

/** The player's last turn this round, if they've had one. */
function lastTurnOf(state: CrownsState, player: number): CrownsTurn | null {
  for (let i = state.turns.length - 1; i >= 0; i--) if (state.turns[i].player === player) return state.turns[i]
  return null
}

/** A turn under a slot, in two short lines (a slot is a third of a phone's width): where they drew from, then what they
 * threw. Blank before their first turn of the round. */
function turnLines(turn: CrownsTurn | null): [string, string] {
  if (!turn) return [' ', ' ']
  const took = turn.took === 'discard' && turn.card ? `Took ${cardName(turn.card)}` : 'Drew'
  return [took, turn.wentOut ? `Out with ${cardName(turn.threw)}` : `Threw ${cardName(turn.threw)}`]
}

/** What the prompt over the hand says on the player's own turn. */
function promptFor(state: CrownsState, picked: string | null): string {
  const last = state.out !== null
  if (state.phase === 'draw') return last ? 'Last turn: draw a card' : 'Draw from the stock or the discard'
  if (!picked) return last ? 'Last turn: pick a card to throw' : 'Pick a card to throw'
  const card = state.hands[state.turn].find((c) => c.id === picked)
  if (!card) return 'Pick a card to throw'
  if (!canThrow(state, state.turn, picked)) return `You just took the ${cardName(card)}: pick another`
  if (canGoOut(state, state.turn, picked)) return `Throw the ${cardName(card)} and go out`
  return `Throw the ${cardName(card)}`
}

/** One turn as the pass cover tells it. */
function turnSentence(turn: CrownsTurn, players: CrownsPlayer[]): string {
  const who = players[turn.player].seat.name
  const drew = turn.took === 'discard' && turn.card ? `took the ${cardName(turn.card)}` : 'drew from the stock'
  if (turn.wentOut) return `${who} ${drew} and went out with the ${cardName(turn.threw)}.`
  return `${who} ${drew} and threw the ${cardName(turn.threw)}.`
}

/** What the pass cover says: everything played since the next player's last turn, which they didn't see; or, at a new
 * round, the wild rank and who's first. Once someone has gone out, that it's their last turn. */
function passMessage(state: CrownsState, next: number, players: CrownsPlayer[]): string {
  let since = state.turns.length
  while (since > 0 && state.turns[since - 1].player !== next) since--
  const turns = state.turns.slice(since)
  if (turns.length === 0) return `Round ${state.round}: ${wildLabel(wildRank(state), state.rules.deck !== 'plain').replace(' Wild', ' are wild')}. ${players[next].seat.name} plays first.`
  const told = turns.map((turn) => turnSentence(turn, players))
  if (state.out !== null) told.push('This is your last turn.')
  return told.join('\n')
}

/** The match's totals under its result, lowest first. */
function Standings({ state, players }: { state: CrownsState; players: CrownsPlayer[] }) {
  const { fg, fgMuted } = useOverlayCardColors()
  const order = state.totals.map((total, i) => ({ total, i })).sort((a, b) => a.total - b.total || a.i - b.i)
  return (
    <View style={styles.standings} testID='fourcrowns-standings'>
      {order.map(({ total, i }) => (
        <Text key={i} variant='titleMedium' style={[styles.center, { color: state.winners?.includes(i) ? fg : fgMuted }]}>
          {`${players[i].seat.name} ${total}`}
        </Text>
      ))}
    </View>
  )
}

function matchContent(state: CrownsState, players: CrownsPlayer[], passAndPlay: boolean): TableCardContent {
  const winners = state.winners ?? []
  const names = winners.map((i) => players[i].seat.name)
  const youWon = !passAndPlay && winners.includes(0)
  let title: string
  if (winners.length > 1) title = youWon ? 'You Tied for the Win!' : `${names.join(' and ')} Tied`
  else title = youWon ? 'You Won!' : passAndPlay ? `${names[0]} Won!` : `${names[0]} Won`
  const celebrate = passAndPlay || youWon
  return { icon: celebrate ? 'trophy' : 'cards-outline', title, body: `Lowest total after ${ROUNDS} rounds.`, details: <Standings state={state} players={players} /> }
}

const styles = StyleSheet.create({
  bannerLine: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 24, justifyContent: 'center', left: 60, position: 'absolute', right: 60 },
  center: { textAlign: 'center' },
  flexText: { color: CHROME_FG, flexShrink: 1 },
  muted: { color: CHROME_FG_MUTED },
  rowLabel: { alignItems: 'center', flexDirection: 'row', gap: 8, height: 24, left: 0, paddingHorizontal: 20, position: 'absolute', right: 0 },
  screen: { flex: 1 },
  slot: { alignItems: 'center', position: 'absolute' },
  slotName: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 18, justifyContent: 'center', maxWidth: '100%', paddingHorizontal: 4 },
  standings: { alignItems: 'center', gap: 2 },
  strong: { color: CHROME_FG },
  wild: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: WILD_BADGE / 2, height: WILD_BADGE, justifyContent: 'center', position: 'absolute', width: WILD_BADGE }
})
