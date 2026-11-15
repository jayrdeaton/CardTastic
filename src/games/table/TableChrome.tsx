// What every two-player table shares around its cards (RatSlap, Slapjack, Six-Card Golf, Trash): who sits in each seat,
// their badge, the Home and Settings buttons at the sides of the midline, the result cards (one per person, each facing
// them), and whether the app is in the foreground.

import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { DialogHeader, overlayActionStyles, OverlayBackdrop, OverlayCard, useCompactDialog, useOverlayCardColors } from '@tastic/hud/chrome'
import { useAtComputer, useProfiles, useSeatColors } from '@tastic/shell'
import { type ReactNode, useEffect, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { Icon, IconButton, Text } from 'react-native-paper'

import { GAME_DIALOG_Z_INDEX } from '@/components/GameChrome'
import { CHROME_FG, previewCardBack } from '@/components/theme'
import { GUEST_PLAYER_ID } from '@/constants/player'
import { usePlayer } from '@/stores/profiles'

import type { PlayerIndex } from './players'
import { tableHome } from './QuitMatch'

export interface Seat {
  name: string
  /** A short tag for the badge, or an icon when there is none. */
  tag: string | null
  icon: string
  color: string
}

/** Who sits at the table: seat 1's player (or Guest), and seat 2's person (a profile picked on the setup screen, or
 * Player 2) or the CPU. `statsIds` are who each seat's results are kept for: seat 1's profile or guest, seat 2's profile
 * (a second guest isn't kept). */
export function useTableSeats(twoPlayer: boolean): { seats: Record<PlayerIndex, Seat>; statsIds: Record<PlayerIndex, string | null> } {
  const { dark } = useAutoPaperTheme()
  const { profileId, profile, color: p1Color } = usePlayer()
  const { profiles, lastSelected } = useProfiles()
  const { p2Color } = useSeatColors(twoPlayer)
  const p2Profile = twoPlayer ? (profiles.find((p) => p.id === lastSelected[2]) ?? null) : null
  return {
    seats: {
      1: { name: profile?.name ?? 'Guest', tag: profile?.tag || null, icon: 'account', color: previewCardBack(p1Color, dark) },
      2: twoPlayer ? { name: p2Profile?.name ?? 'Player 2', tag: p2Profile?.tag || null, icon: 'account', color: previewCardBack(p2Color, dark) } : { name: 'CPU', tag: null, icon: 'robot-outline', color: previewCardBack(p2Color, dark) }
    },
    statsIds: { 1: profileId ?? GUEST_PLAYER_ID, 2: p2Profile?.id ?? null }
  }
}

/** Whether 2 Player's two people sit face to face across the table, player 2's side turned to face them: only on a phone or tablet,
 * natively or in its browser. At a computer (the shell's useAtComputer: the web without a touch-first screen, at any width) they sit
 * side by side, so player 2's side is drawn upright, as it is against the CPU, and their result card sits beside player 1's (Jay,
 * 2026-11-07: face to face only on mobile or web-mobile). */
export function useFaceToFace(twoPlayer: boolean): boolean {
  const atComputer = useAtComputer()
  return twoPlayer && !atComputer
}

/** Whether the app is in the foreground: a table's timers (the CPU, an automatic step) hold while it isn't. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setActive(next === 'active'))
    return () => subscription.remove()
  }, [])
  return active
}

export function SeatBadge({ seat }: { seat: Seat }) {
  return (
    <View style={[styles.badge, { backgroundColor: seat.color }]}>
      {seat.tag ? (
        <Text style={styles.badgeText} numberOfLines={1}>
          {seat.tag}
        </Text>
      ) : (
        <Icon source={seat.icon} size={14} color='#fff' />
      )}
    </View>
  )
}

/** Home and Settings at the two ends of the table's midline, where neither player's cards are. */
export function TableSideButtons({ y, onSettings }: { y: number; onSettings: () => void }) {
  return (
    <View style={[styles.sideButtons, { top: y - 24 }]} pointerEvents='box-none'>
      <IconButton icon='home' iconColor={CHROME_FG} accessibilityLabel='Home' onPress={tableHome} />
      <IconButton icon='cog' iconColor={CHROME_FG} accessibilityLabel='Settings' onPress={onSettings} />
    </View>
  )
}

/** What one person's result card says. */
export interface TableCardContent {
  icon: string
  title: string
  body?: string
  /** Under the body: a score table, say. */
  details?: ReactNode
}

/** A card over the table (a match's result, a hole's or a round's scores): one against the CPU; with two people, one in
 * each half, each facing its player (face to face, player 2's at the top turned to face them; at a computer, side by side,
 * player 1's on the left, both upright: useFaceToFace). Either person's button goes on. */
export function TableOverlay({ humans, content, actionLabel, onAction, showHome = true, testID }: { humans: readonly PlayerIndex[]; content: (viewer: PlayerIndex) => TableCardContent; actionLabel: string; onAction: () => void; showHome?: boolean; testID: string }) {
  const { compact, onLayout } = useCompactDialog()
  const card = (viewer: PlayerIndex) => <TableOverlayCard viewer={viewer} content={content(viewer)} compact={compact} actionLabel={actionLabel} onAction={onAction} showHome={showHome} testID={testID} />
  const faceToFace = useFaceToFace(humans.length === 2)
  return (
    <OverlayBackdrop style={styles.overlay} onLayout={onLayout}>
      {humans.length === 2 && faceToFace ? (
        <View style={styles.halves}>
          <View style={[styles.half, styles.flipped]}>{card(2)}</View>
          <View style={styles.half}>{card(1)}</View>
        </View>
      ) : humans.length === 2 ? (
        <View style={[styles.halves, styles.halvesSideBySide]}>
          <View style={styles.halfSideBySide}>{card(1)}</View>
          <View style={styles.halfSideBySide}>{card(2)}</View>
        </View>
      ) : (
        card(1)
      )}
    </OverlayBackdrop>
  )
}

function TableOverlayCard({ viewer, content, compact, actionLabel, onAction, showHome, testID }: { viewer: PlayerIndex; content: TableCardContent; compact: boolean; actionLabel: string; onAction: () => void; showHome: boolean; testID: string }) {
  const { colors } = useAutoPaperTheme()
  const { fg } = useOverlayCardColors()
  return (
    <OverlayCard style={styles.card}>
      <DialogHeader icon={content.icon} title={content.title} compact={compact} />
      {content.body ? (
        <Text variant='bodyLarge' style={[styles.body, { color: fg }]}>
          {content.body}
        </Text>
      ) : null}
      {content.details}
      <View style={overlayActionStyles.actions}>
        {showHome ? (
          <Button mode='outlined' onPress={tableHome} style={overlayActionStyles.actionButton} testID={`${testID}-home-${viewer}`}>
            Home
          </Button>
        ) : null}
        <Button mode='contained' onPress={onAction} style={overlayActionStyles.actionButton} buttonColor={colors.primary} textColor={colors.onPrimary} testID={`${testID}-action-${viewer}`}>
          {actionLabel}
        </Button>
      </View>
    </OverlayCard>
  )
}

export const tableStyles = StyleSheet.create({
  flipped: { transform: [{ rotate: '180deg' }] }
})

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: 11, height: 22, justifyContent: 'center', minWidth: 22, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  body: { textAlign: 'center' },
  card: { width: '100%' },
  flipped: tableStyles.flipped,
  half: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  // Side by side, each half is its own column, padded so a full-width card stays off the other's.
  halfSideBySide: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  halves: { alignSelf: 'stretch', flex: 1 },
  halvesSideBySide: { flexDirection: 'row' },
  overlay: { paddingHorizontal: 24, zIndex: GAME_DIALOG_Z_INDEX },
  sideButtons: { flexDirection: 'row', justifyContent: 'space-between', left: 4, position: 'absolute', right: 4 }
})
