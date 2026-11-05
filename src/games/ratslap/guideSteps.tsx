import { useAutoPaperTheme } from '@rific/auto-paper'
import type { GuideStep } from '@tastic/hud/guide'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { CARD_HEIGHT, CARD_WIDTH, MiniCard, PATH_WIDTH, PathDots, type Suit } from '@/components/GuideArt'
import { MiniBack } from '@/games/table/guideArt'

/** The rules RatSlap's cards depend on: the player's own settings, as the setup screen will start them. */
export interface RatSlapGuideInput {
  doubles: boolean
  sandwiches: boolean
  jokers: boolean
}

// RatSlap's own How to Play, shown on its tile's first tap (the shell's GuideHost), after the pack's three cards have
// taught the solitaire games. Only what a first match needs: how to play a card, what a face card does, how to slap, and
// the jokers when they're in. The Rules sheet has the rest (a wrong slap's burn, slapping back in). The guide copy rules
// (constants/guideSteps.tsx): Title Case titles, bodies in two lines, never "tap" to a desktop player.
export function getRatSlapGuideSteps(input: RatSlapGuideInput, { touch }: { touch: boolean }): GuideStep[] {
  const press = touch ? 'Tap' : 'Click'
  const steps: GuideStep[] = [
    { title: `${press} Your Deck`, body: `${press} your deck to play your top card onto the pile.`, art: <PlayArt /> },
    { title: 'Face Cards', body: 'A J, Q, K or A gives the other player 1 to 4 tries to answer.', art: <FaceCardArt /> }
  ]
  const slapOn = input.doubles && input.sandwiches ? 'a double or a sandwich' : input.doubles ? 'a double' : input.sandwiches ? 'a sandwich' : null
  if (slapOn) steps.push({ title: 'Slap the Pile', body: `${press} anywhere on your side to slap ${slapOn}.`, art: <SlapArt under={['7', 'spade']} top={['7', 'heart']} label='Two sevens on the pile, slapped' /> })
  if (input.jokers) steps.push({ title: 'Jokers', body: 'A joker cancels any face card’s challenge.', art: <JokerArt /> })
  return steps
}

/** Your deck playing its top card onto the pile. Slapjack's first card too. */
export function PlayArt() {
  return (
    <View accessible accessibilityLabel='Your deck plays its top card onto the pile' style={styles.stage}>
      <MiniBack style={styles.left} />
      <PathDots style={styles.path} />
      <MiniCard rank='9' suit='heart' style={styles.right} />
    </View>
  )
}

function FaceCardArt() {
  const { colors } = useAutoPaperTheme()
  return (
    <View accessible accessibilityLabel='A King gives three tries' style={styles.stage}>
      <MiniCard rank='K' suit='spade' style={styles.left} />
      <View style={styles.tries}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.try, { borderColor: colors.primary }]} />
        ))}
        <Text variant='labelLarge' style={{ color: colors.onSurfaceVariant }}>
          3 tries
        </Text>
      </View>
    </View>
  )
}

/** Two cards on the pile and a hand slapping them: RatSlap's double, Slapjack's Jack. With `wrong`, the slap is crossed
 * out. */
export function SlapArt({ under, top, label, wrong = false }: { under: [string, Suit]; top: [string, Suit]; label: string; wrong?: boolean }) {
  const { colors } = useAutoPaperTheme()
  return (
    <View accessible accessibilityLabel={label} style={styles.stage}>
      <MiniCard rank={under[0]} suit={under[1]} style={[styles.pileUnder, { transform: [{ rotate: '-8deg' }] }]} />
      <MiniCard rank={top[0]} suit={top[1]} style={[styles.pileTop, { transform: [{ rotate: '7deg' }] }]} />
      <View style={styles.hand}>
        <Icon source='hand-back-right' size={34} color={wrong ? colors.error : colors.primary} />
      </View>
      {wrong ? (
        <View style={styles.wrong}>
          <Icon source='close-thick' size={22} color={colors.error} />
        </View>
      ) : null}
    </View>
  )
}

function JokerArt() {
  const { colors } = useAutoPaperTheme()
  return (
    <View accessible accessibilityLabel='A joker on a King' style={styles.stage}>
      <MiniCard rank='K' suit='spade' style={[styles.pileUnder, { transform: [{ rotate: '-8deg' }] }]} />
      <View style={[styles.card, styles.pileTop, styles.joker, { backgroundColor: colors.surface, borderColor: colors.outline, transform: [{ rotate: '7deg' }] }]}>
        <Icon source='star-four-points' size={22} color={colors.error} />
      </View>
    </View>
  )
}

const STAGE_WIDTH = 168
const STAGE_HEIGHT = CARD_HEIGHT + 16

const styles = StyleSheet.create({
  card: { borderRadius: 5, borderWidth: 1, height: CARD_HEIGHT, position: 'absolute', width: CARD_WIDTH },
  hand: { left: STAGE_WIDTH / 2 + 12, position: 'absolute', top: 0 },
  joker: { alignItems: 'center', justifyContent: 'center' },
  left: { left: 16, top: 8 },
  path: { left: (STAGE_WIDTH - PATH_WIDTH) / 2, position: 'absolute', top: STAGE_HEIGHT / 2 - 2 },
  pileTop: { left: STAGE_WIDTH / 2 - CARD_WIDTH / 2 + 6, top: 8 },
  pileUnder: { left: STAGE_WIDTH / 2 - CARD_WIDTH / 2 - 10, top: 8 },
  right: { left: STAGE_WIDTH - CARD_WIDTH - 16, top: 8 },
  stage: { height: STAGE_HEIGHT, width: STAGE_WIDTH },
  tries: { alignItems: 'center', flexDirection: 'row', gap: 6, left: 72, position: 'absolute', top: STAGE_HEIGHT / 2 - 10 },
  try: { borderRadius: 7, borderWidth: 2, height: 14, width: 14 },
  wrong: { left: STAGE_WIDTH / 2 + 42, position: 'absolute', top: 30 }
})
