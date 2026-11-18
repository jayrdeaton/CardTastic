// Quit Match? for the two-player tables: a match isn't saved, so leaving one under way asks first, from the table's back arrow,
// Android's back or the browser's back (Jay, 2026-11-15), as DuelTastic's and PuckTastic's matches do. The block on every way off the
// table is @tastic/shell's useBackBlock; the dialog is hud's ConfirmDialog, worded as theirs. Every way out goes to the game's setup
// screen (Jay, 2026-11-18).

import { ConfirmDialog } from '@tastic/hud/chrome'
import { useBackBlock } from '@tastic/shell'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'

import { gameSetupHref } from '@/utils/setupHref'

export interface QuitMatch {
  /** Quit Match? is up: the table holds, as it does under Settings. */
  asking: boolean
  /** The block stopped a way off the table: ask. */
  blocked: () => void
  cancel: () => void
}

/** Every back on a table: to the game's setup screen, or, while a match is under way, Quit Match? (the block stops the navigation).
 * dismissTo pops to the setup screen beneath the table, and opens one when there is none (a page reloaded on the web). */
export function useTableBack(): () => void {
  const { game } = useLocalSearchParams<{ game: string }>()
  return useCallback(() => router.dismissTo(gameSetupHref(game)), [game])
}

/** Quit Match?'s state, called before the match hook so `asking` can hold the table (QuitMatchDialog, after it, blocks the
 * ways off the table and draws the dialog). */
export function useQuitMatch(): QuitMatch {
  const [asking, setAsking] = useState(false)
  const blocked = useCallback(() => setAsking(true), [])
  const cancel = useCallback(() => setAsking(false), [])
  return { asking, blocked, cancel }
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
  const back = useTableBack()
  const leave = useBackBlock(underWay, quit.blocked, back)
  return <ConfirmDialog visible={quit.asking} title='Quit Match?' message="This match won't be saved." confirmLabel='Quit' cancelLabel='Cancel' icon='alert-circle-outline' onConfirm={leave} onCancel={quit.cancel} />
}
