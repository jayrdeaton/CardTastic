import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { GameSession } from '@/components/useGameSession'
import { useSettings } from '@/hooks/useSettings'
import type { DailyDeal } from '@/redux/dailySlice'
import { DEFAULT_SETTINGS } from '@/redux/settingsSlice'
import { dailyDealFor, noteDailyInPlay, submitDailyWin } from '@/stores/daily'
import { setDailyScope } from '@/stores/dailyScope'
import type { SolitaireGameId } from '@/stores/statsTypes'

import { useDailyReminder } from './useDailyReminder'

// The rules a Daily Deal is played under, whatever the player has picked for their own games: everyone's run is on the same rules
const DAILY_RULES = {
  klondikeDraw: DEFAULT_SETTINGS.klondikeDraw,
  spiderSuits: DEFAULT_SETTINGS.spiderSuits,
  golfRankWrap: DEFAULT_SETTINGS.golfRankWrap,
  tripeaksRankWrap: DEFAULT_SETTINGS.tripeaksRankWrap,
  canfieldDraw: DEFAULT_SETTINGS.canfieldDraw,
  scorpionAssistedStock: DEFAULT_SETTINGS.scorpionAssistedStock,
  fortyThievesRunMoves: DEFAULT_SETTINGS.fortyThievesRunMoves
}

/** The day of the Daily Deal this play screen was opened for (`/play/<game>?daily=<day>`), if any. */
function useDailyParam(): string | null {
  const { daily } = useLocalSearchParams<{ daily?: string }>()
  return typeof daily === 'string' ? daily : null
}

/** The settings a play screen deals by: the player's own, with a Daily Deal's rules in place of theirs. */
export function useDealSettings() {
  const { settings } = useSettings()
  const daily = useDailyParam() !== null
  return useMemo(() => ({ settings: daily ? { ...settings, ...DAILY_RULES } : settings }), [settings, daily])
}

/**
 * The Daily Deal this play screen is playing, or null for a regular game. Its seed deals the board. The setup screen's Today's Deal
 * card started it with the server before opening the screen, so it's known from the first render, and the save scope is set then,
 * ahead of the screen's load. A win goes to the server the moment it's made, since the server's clock runs until it arrives.
 */
export function useDailyDeal(game: SolitaireGameId, won: boolean, session: Pick<GameSession, 'getRun'>): DailyDeal | null {
  const day = useDailyParam()
  const [deal] = useState(() => {
    const started = day ? dailyDealFor(game, day) : null
    setDailyScope(started ? { game, day: started.day, seed: started.seed } : null)
    return started
  })
  // So closing the app here comes back here (the pack's resumeHref)
  useEffect(() => noteDailyInPlay(game, deal?.day ?? null), [game, deal])
  // A regular game's screen says when the game's new Daily is out
  useDailyReminder(game, !deal)
  const sent = useRef(false)
  useEffect(() => {
    if (!deal || !won || sent.current) return
    const run = session.getRun()
    if (run?.seed !== deal.seed) return
    sent.current = true
    // Unreachable, it stays unsent: the win card and Today's Deal both offer it again
    submitDailyWin(game, run.actions).catch(() => {})
  }, [deal, won, game, session])
  return deal
}
