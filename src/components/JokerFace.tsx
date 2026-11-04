import { CARD_FONT_FAMILY, cardFaceColor, type Joker, type TableColors } from '@tastic/cards'
import { StyleSheet, Text, View } from 'react-native'
import { Icon } from 'react-native-paper'

const LETTERS = ['J', 'O', 'K', 'E', 'R']

/** A joker's face, drawn live (the card face bitmaps hold only the 52 ranked cards): JOKER spelled down
 * the top-left corner and up the bottom-right, and a star in the middle. Like a printed deck, one joker
 * is red and the other black (`joker-1` is the red one). Drawn in the frame it mounts, so unlike a face
 * bitmap it never shows blank. */
export function JokerFace({ card, colors, width, height, invert }: { card: Joker; colors: TableColors; width: number; height: number; invert: boolean }) {
  const ink = card.id.endsWith('1') ? colors.textRed : invert ? colors.textBlackInverted : colors.textBlack
  const letterSize = Math.round(width * 0.15)
  const corner = (
    <View style={styles.corner}>
      {LETTERS.map((letter) => (
        <Text key={letter} style={[styles.letter, { color: ink, fontSize: letterSize, lineHeight: letterSize * 1.02 }]}>
          {letter}
        </Text>
      ))}
    </View>
  )
  return (
    <View style={[styles.face, { backgroundColor: cardFaceColor(colors, invert), height, width }]} accessibilityLabel='Joker'>
      <View style={[styles.cornerTop, { left: width * 0.07, top: height * 0.05 }]}>{corner}</View>
      <View style={[styles.cornerBottom, { bottom: height * 0.05, right: width * 0.07 }]}>{corner}</View>
      <Icon source='star-four-points' size={width * 0.5} color={ink} />
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { alignItems: 'center' },
  cornerBottom: { position: 'absolute', transform: [{ rotate: '180deg' }] },
  cornerTop: { position: 'absolute' },
  face: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: CARD_FONT_FAMILY, fontWeight: 'bold' }
})
