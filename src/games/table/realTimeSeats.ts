import type { SeatTwo } from '@tastic/shell'
import { Platform } from 'react-native'

const PERSON_OR_CPU: readonly SeatTwo[] = ['cpu', 'person']
const CPU_ONLY: readonly SeatTwo[] = ['cpu']

/** Whether this is a computer: the web without a touch-first screen. The same test as @tastic/shell's useAtComputer
 *  (@tastic/core's useIsTouchPrimaryDevice), without the hook, so a game definition can read it. */
export function isAtComputer(): boolean {
  if (Platform.OS !== 'web') return false
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return true
  const touchPoints = navigator.maxTouchPoints > 0
  if (!window.matchMedia) return !touchPoints
  if (window.matchMedia('(pointer: fine)').matches) return true
  return !(touchPoints || window.matchMedia('(pointer: coarse)').matches)
}

/** Seat 2's choices in a game played in real time (RatSlap, Slapjack, Speed): two people need a screen each can touch at
 *  the same moment, and a computer has one mouse, so there seat 2 is only ever the CPU (Jay, 2026-11-11). The turn-based
 *  and pass-and-play games keep Player at a computer: one mouse is enough when people take turns. A game definition reads
 *  this through a getter (`get seatTwo()`), so the setup screen asks each time it draws. */
export const realTimeSeatTwo = (atComputer = isAtComputer()): readonly SeatTwo[] => (atComputer ? CPU_ONLY : PERSON_OR_CPU)
