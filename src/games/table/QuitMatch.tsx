// Quit Match? for the two-player tables: a match isn't saved, so leaving one under way asks first, from a Home button on the
// table, Android's back or the browser's back (Jay, 2026-11-15), as DuelTastic's and PuckTastic's matches do. The block on
// every way off the table is @tastic/shell's useBackBlock; the dialog is hud's ConfirmDialog, worded as theirs.

import { ConfirmDialog } from '@tastic/hud/chrome'
import { useBackBlock } from '@tastic/shell'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'

/** Where Quit goes: back (the game's setup screen, from Android's or the browser's back) or Home (a Home button). */
export type QuitTo = 'back' | 'home'

export interface QuitMatch {
  /** Quit Match? is up: the table holds, as it does under Settings. */
  asking: boolean
  /** Where its Quit goes. */
  to: QuitTo
  /** The block stopped a way off the table: ask, with Quit going Home if a Home button started it, else back. */
  blocked: () => void
  cancel: () => void
}

function goHome() {
  router.dismissTo('/')
}

// Set by a Home button just before it navigates, and read and cleared when the block stops that navigation (whenever it
// calls in), so Quit Match? knows to go Home rather than back. One table is mounted at a time. Module-level so every Home
// button on a table (the side buttons, and a hand's, hole's or round's card between deals) needs nothing threaded to it.
let homePressed = false

/** Every Home button on a table: Home, or, while a match is under way, Quit Match? (the block stops the navigation). */
export function tableHome() {
  homePressed = true
  goHome()
}

/** Quit Match?'s state, called before the match hook so `asking` can hold the table (QuitMatchDialog, after it, blocks the
 * ways off the table and draws the dialog). */
export function useQuitMatch(): QuitMatch {
  const [asking, setAsking] = useState<QuitTo | null>(null)
  const blocked = useCallback(() => {
    setAsking(homePressed ? 'home' : 'back')
    homePressed = false
  }, [])
  const cancel = useCallback(() => setAsking(null), [])
  return { asking: asking !== null, to: asking ?? 'back', blocked, cancel }
}

/** Whether a match has something to lose: its state has moved on since it was dealt, and it isn't over. A rematch (over
 * turning back off) starts again, so a fresh deal leaves at once, as a match at 0-0 does in the fleet's games. */
export function useMatchUnderWay(state: object, over: boolean): boolean {
  const [start, setStart] = useState(state)
  const [wasOver, setWasOver] = useState(over)
  if (wasOver !== over) {
    setWasOver(over)
    if (!over) setStart(state)
  }
  return !over && state !== start
}

/** Blocks every way off the table while its match is under way, and draws Quit Match?. */
export function QuitMatchDialog({ quit, state, over }: { quit: QuitMatch; state: object; over: boolean }) {
  const underWay = useMatchUnderWay(state, over)
  const leave = useBackBlock(underWay, quit.blocked, quit.to === 'home' ? goHome : undefined)
  return <ConfirmDialog visible={quit.asking} title='Quit Match?' message="This match won't be saved." confirmLabel='Quit' cancelLabel='Cancel' icon='alert-circle-outline' onConfirm={leave} onCancel={quit.cancel} />
}
