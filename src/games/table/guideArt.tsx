// Pictures for the two-player games' How to Play cards (each game's guideSteps.tsx), built from the guide's mini cards
// (components/GuideArt.tsx): plain Views in the live Paper theme.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { CARD_HEIGHT, CARD_WIDTH, MiniCard, PATH_WIDTH, PathDots, type Suit } from '@/components/GuideArt'

/** A mini card, face up ([rank, suit]) or a back (null). */
export type MiniCardSpec = [string, Suit] | null

/** A face-down card: the theme's primary, framed like a mini card. */
export function MiniBack({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useAutoPaperTheme()
  return <View style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.outline }, style]} />
}

export function Mini({ spec, style }: { spec: MiniCardSpec; style?: StyleProp<ViewStyle> }) {
  return spec ? <MiniCard rank={spec[0]} suit={spec[1]} style={style} /> : <MiniBack style={style} />
}

/** Rows of mini cards, at `scale` of the guide's card size, so a whole grid fits the picture's height. */
export function MiniGrid({ rows, scale, label, marks }: { rows: MiniCardSpec[][]; scale: number; label: string; marks?: { row: number; column: number; text: string }[] }) {
  const { colors } = useAutoPaperTheme()
  const gap = 4
  const columns = Math.max(...rows.map((row) => row.length))
  const width = columns * CARD_WIDTH + (columns - 1) * gap
  const height = rows.length * CARD_HEIGHT + (rows.length - 1) * gap
  return (
    <View accessible accessibilityLabel={label} style={{ height: height * scale, width: width * scale }}>
      <View style={[styles.absolute, { height, left: (width * scale - width) / 2, top: (height * scale - height) / 2, transform: [{ scale }], width }]}>
        {rows.map((row, r) => row.map((spec, c) => <Mini key={`${r}-${c}`} spec={spec} style={[styles.absolute, { left: c * (CARD_WIDTH + gap), top: r * (CARD_HEIGHT + gap) }]} />))}
        {marks?.map(({ row, column, text }) => (
          <View key={`${row}-${column}`} style={[styles.mark, { backgroundColor: colors.primary, left: column * (CARD_WIDTH + gap) + CARD_WIDTH - 12, top: row * (CARD_HEIGHT + gap) - 8 }]}>
            <Text variant='labelSmall' style={{ color: colors.onPrimary }}>
              {text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/** One card moving to another spot: `from`, the dotted path, then `to`. */
export function MoveArt({ from, to, label }: { from: MiniCardSpec; to: MiniCardSpec; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.stage}>
      <Mini spec={from} style={styles.left} />
      <PathDots style={styles.path} />
      <Mini spec={to} style={styles.right} />
    </View>
  )
}

/** Two cards side by side, the second crossed out: a card that ends the turn. */
export function NoArt({ yes, no, label }: { yes: MiniCardSpec; no: MiniCardSpec; label: string }) {
  const { colors } = useAutoPaperTheme()
  return (
    <View accessible accessibilityLabel={label} style={styles.stage}>
      <Mini spec={yes} style={styles.left} />
      <Icon source='check-bold' size={22} color={colors.primary} />
      <Mini spec={no} style={styles.right} />
      <View style={styles.cross}>
        <Icon source='close-thick' size={22} color={colors.error} />
      </View>
    </View>
  )
}

const STAGE_WIDTH = 168
const STAGE_HEIGHT = CARD_HEIGHT + 16

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  card: { borderRadius: 5, borderWidth: 1, height: CARD_HEIGHT, position: 'absolute', width: CARD_WIDTH },
  cross: { left: STAGE_WIDTH - CARD_WIDTH - 16 + CARD_WIDTH / 2 - 11, position: 'absolute', top: STAGE_HEIGHT / 2 - 11 },
  left: { left: 16, top: 8 },
  mark: { alignItems: 'center', borderRadius: 10, height: 20, justifyContent: 'center', minWidth: 20, paddingHorizontal: 4, position: 'absolute' },
  path: { left: (STAGE_WIDTH - PATH_WIDTH) / 2, position: 'absolute', top: STAGE_HEIGHT / 2 - 2 },
  right: { left: STAGE_WIDTH - CARD_WIDTH - 16, top: 8 },
  stage: { alignItems: 'center', height: STAGE_HEIGHT, justifyContent: 'center', width: STAGE_WIDTH }
})
