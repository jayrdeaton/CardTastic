import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native'

import { gameStatsSections, RecordsTab, SolitaireAchievementList, SolitaireStatsSections, statsReset } from '@/components/SolitaireStats'

// What Solitaire shows on @tastic/shell's stats screen (components/SolitaireStats.tsx), rendered on its own: the screen
// itself (its tabs, the two pickers, opening on whoever is playing, the press-away, the turned frame) and Profiles are
// the shell's, tested in the package. Each part is handed the player the screen's picker has (null for Everyone,
// 'guest', or a profile's id) and, where it narrows, the game (null for All Games).
//   - useGameStats is replaced (the stats, recent wins and records a test sets); usePlayerData and the roster too.
//   - hud's StatSection, StatRow and AchievementRow are stand-ins that keep their label and value, so the sections and
//     rows are read by label.

/** The stats, recent wins and records useGameStats hands the sections (DEFAULT_STATS and none unless a test says otherwise). */
let mockStats: unknown = null
let mockRecentWins: unknown = {}
let mockTopWins: unknown = {}
let mockProfilesList: unknown[] = []
const mockResetAll = jest.fn()
const mockPlayerData = { resetPlayer: jest.fn() }

jest.mock('@/stores/playerData', () => ({ usePlayerData: () => mockPlayerData }))
jest.mock('@/stores/gameStats', () => {
  const { DEFAULT_STATS } = jest.requireActual('@/stores/statsValidation')
  return {
    useGameStats: () => ({ stats: mockStats ?? DEFAULT_STATS, unlockedAchievements: [], resetAll: mockResetAll, recentWins: mockRecentWins, topWins: mockTopWins })
  }
})
jest.mock('@/stores/profiles', () => ({ useProfiles: () => ({ profiles: mockProfilesList }) }))
jest.mock('@/stores/achievementCatalog', () => ({ ACHIEVEMENT_CATALOG: [] }))
jest.mock('@tastic/achievements', () => ({
  ...jest.requireActual('@tastic/achievements'),
  // One stand-in row, so the list has something to show.
  getAchievementCatalogRows: () => [{ id: 'sample', icon: 'trophy', title: 'Sample', description: 'A sample.', tierColor: '#ffd700' }]
}))
jest.mock('@/components/theme', () => {
  const actual = jest.requireActual('@/components/theme')
  return { ...actual, useTableColors: () => actual.lightColors }
})
jest.mock('@tastic/hud/chrome', () => {
  const { View } = require('react-native')
  return {
    ...jest.requireActual('@tastic/hud/chrome'),
    StatSection: ({ label, children }: { label: string; children: unknown }) => (
      <View testID='stat-section' accessibilityLabel={label}>
        {children}
      </View>
    ),
    StatRow: ({ label, value }: { label: string; value: string }) => <View testID={`row:${label}`} accessibilityValue={{ text: value }} />,
    AchievementRow: () => <View testID='achievement-row' />
  }
})

const { applyDealAbandoned, applyDealWon } = jest.requireActual('@/stores/statsEngine')
const { DEFAULT_STATS } = jest.requireActual('@/stores/statsValidation')
const WON = { seconds: 120, moves: 100, score: 220, usedHint: false }

const sectionLabels = () => screen.queryAllByTestId('stat-section').map((section) => section.props.accessibilityLabel as string)
const rowValue = (label: string) => screen.getAllByTestId(`row:${label}`).map((row) => row.props.accessibilityValue.text as string)

beforeEach(() => {
  mockStats = null
  mockRecentWins = {}
  mockTopWins = {}
  mockProfilesList = []
  mockResetAll.mockClear()
  mockPlayerData.resetPlayer.mockClear()
})

describe("the Stats tab's section across every game", () => {
  it('shows the calendar, the totals and Activity, every count with thousands separators', async () => {
    let stats = DEFAULT_STATS
    for (let i = 0; i < 20; i++) stats = applyDealAbandoned(stats, 'spider', null)
    mockStats = stats
    await render(<SolitaireStatsSections profileId={null} gameId={null} />)
    expect(sectionLabels()).toEqual(['CALENDAR', 'OVERALL', 'ACTIVITY'])
    // 20 Spider deals of 104 cards.
    expect(rowValue('Cards Dealt')).toEqual(['2,080'])
  })

  it('narrowed to one game: its totals under its name, and no cross-game rows', async () => {
    mockStats = applyDealWon(applyDealWon(DEFAULT_STATS, 'klondike', WON, null), 'spider', WON, null)
    const { rerender } = await render(<SolitaireStatsSections profileId={null} gameId={null} />)
    expect(rowValue('Games Played')).toEqual(['2'])
    expect(screen.queryByTestId('row:Games Solved')).not.toBeNull()

    await rerender(<SolitaireStatsSections profileId={null} gameId='spider' />)
    expect(sectionLabels()).toEqual(['CALENDAR', 'SPIDER', 'ACTIVITY'])
    expect(rowValue('Games Played')).toEqual(['1'])
    expect(screen.queryByTestId('row:Games Solved')).toBeNull()
    expect(screen.queryByTestId('row:Most Played')).toBeNull()
    expect(screen.queryByTestId('row:Win Streak, All Games')).toBeNull()
  })

  it("shows guest's own stats under Guest, and the phone's totals under Everyone", async () => {
    // A profile played twice, guest once.
    mockStats = applyDealWon(applyDealAbandoned(applyDealWon(DEFAULT_STATS, 'klondike', WON, 'kid'), 'klondike', 'kid'), 'golf', WON, 'guest')
    const { rerender } = await render(<SolitaireStatsSections profileId='guest' gameId={null} />)
    expect(rowValue('Games Played')).toEqual(['1'])
    await rerender(<SolitaireStatsSections profileId={null} gameId={null} />)
    expect(rowValue('Games Played')).toEqual(['3'])
  })

  it('measures the overall best against par, in a word', async () => {
    const { parFor } = jest.requireActual('@/engine/par')
    const par = parFor('klondike')
    const score = Math.round(par.score * 0.9)
    mockStats = applyDealWon(DEFAULT_STATS, 'klondike', { seconds: par.seconds, moves: score - par.seconds, score, usedHint: false }, null)
    await render(<SolitaireStatsSections profileId={null} gameId={null} />)
    // Overall has no par row near it, so its row names par in the label.
    expect(rowValue('Best vs Par')).toEqual(['10% under'])
  })
})

describe("a game's rule sets", () => {
  it('shows its default rules always and its other rules once played', async () => {
    const Spider = gameStatsSections('spider')
    const { rerender } = await render(<Spider profileId={null} />)
    expect(sectionLabels()).toEqual(['SPIDER · 1 SUIT'])

    mockStats = applyDealWon(DEFAULT_STATS, 'spider-4suit', WON, null)
    await rerender(<Spider profileId={null} />)
    expect(sectionLabels()).toEqual(['SPIDER · 1 SUIT', 'SPIDER · 4 SUITS'])
  })

  it("shows each rule set's expert par in full, and how the best and the player's own par compare with it", async () => {
    const { parFor } = jest.requireActual('@/engine/par')
    const par = parFor('klondike')
    const score = Math.round(par.score * 0.9)
    mockStats = applyDealWon(DEFAULT_STATS, 'klondike', { seconds: par.seconds, moves: score - par.seconds, score, usedHint: false }, null)
    // No profiles: Everyone is the guest, whose par the rows show.
    mockRecentWins = { guest: { klondike: [{ score: par.score * 1.1, moves: par.moves, seconds: par.seconds }] } }
    const Klondike = gameStatsSections('klondike')
    await render(<Klondike profileId={null} />)
    const m = Math.floor(par.seconds / 60)
    const sec = String(par.seconds % 60).padStart(2, '0')
    expect(rowValue('Expert Par')).toEqual([`${par.score} · ${m}:${sec} · ${par.moves} moves`])
    // Under it, each comparison in a word: the Expert Par row above says which par.
    expect(rowValue('Best Score')).toEqual([`${score} · 10% under`])
    expect(rowValue('Fastest')).toEqual([`${m}:${sec} · even`])
    expect(rowValue('Your Par')).toEqual([`${Math.round(par.score * 1.1)} · 10% over`])
  })

  it('has no Your Par under Everyone once there are profiles (a par is one player’s)', async () => {
    mockProfilesList = [{ id: 'kid', name: 'Kid', color: '#ff0000' }]
    const Klondike = gameStatsSections('klondike')
    await render(<Klondike profileId={null} />)
    expect(screen.queryByTestId('row:Your Par')).toBeNull()
  })
})

describe('the Records tab', () => {
  const { addTopWin } = jest.requireActual('@/engine/topWins')
  type Win = { moves: number; seconds: number; at: number | null }
  const boards = (...wins: Win[]) => wins.reduce((top: unknown, w) => addTopWin(top, { ...w, score: w.moves + w.seconds }), undefined)
  // Stats that count these wins in Klondike, for one player (or Everyone with null), so the boards saw every one.
  const statsWith = (wins: { player: string | null; n: number }[]) => wins.reduce((stats, { player, n }) => Array.from({ length: n }).reduce((s: unknown) => applyDealWon(s, 'klondike', { seconds: 200, moves: 100, score: 300, usedHint: false }, player), stats), DEFAULT_STATS)
  const records = () => screen.queryAllByTestId('record-row').map((row) => row.props.accessibilityLabel as string)
  const oct21 = new Date(2026, 9, 21, 12).getTime()

  it("lists each rule set's best wins by best score, ranked, and by fastest on the switch", async () => {
    mockTopWins = { guest: { klondike: boards({ moves: 100, seconds: 300, at: oct21 }, { moves: 150, seconds: 200, at: null }, { moves: 90, seconds: 400, at: oct21 }) } }
    mockStats = statsWith([{ player: null, n: 3 }])
    await render(<RecordsTab profileId={null} gameId={null} />)

    expect(sectionLabels()).toEqual(['KLONDIKE · DRAW 1'])
    expect(records()).toEqual(['#1, score 350, time 3:20, 150 moves', '#2, score 400, time 5:00, 100 moves, Oct 21', '#3, score 490, time 6:40, 90 moves, Oct 21'])

    await fireEvent.press(screen.getByText('Fastest'))
    expect(records().map((r) => r.split(', ')[2])).toEqual(['time 3:20', 'time 5:00', 'time 6:40'])
  })

  it("puts every player's wins on one board under Everyone, each named, and only theirs under a player", async () => {
    mockProfilesList = [{ id: 'kid', name: 'Kid', color: '#ff0000' }]
    mockTopWins = { kid: { klondike: boards({ moves: 100, seconds: 300, at: null }) }, guest: { klondike: boards({ moves: 100, seconds: 200, at: null }) } }
    mockStats = statsWith([
      { player: 'kid', n: 1 },
      { player: 'guest', n: 1 }
    ])
    const { rerender } = await render(<RecordsTab profileId='kid' gameId={null} />)
    expect(records()).toEqual(['#1, score 400, time 5:00, 100 moves'])

    await rerender(<RecordsTab profileId={null} gameId={null} />)
    // The name takes the moves' place.
    expect(records()).toEqual(['#1, score 300, time 3:20, Guest', '#2, score 400, time 5:00, Kid'])
  })

  it('shares a place between equal wins', async () => {
    mockTopWins = { guest: { klondike: boards({ moves: 100, seconds: 200, at: null }, { moves: 120, seconds: 180, at: null }, { moves: 100, seconds: 250, at: null }) } }
    mockStats = statsWith([{ player: null, n: 3 }])
    await render(<RecordsTab profileId={null} gameId={null} />)
    expect(records().map((r) => r.split(', ')[0])).toEqual(['#1', '#1', '#3'])
  })

  it("doesn't number a board missing some of the wins (won before the boards were kept), and says so", async () => {
    mockTopWins = { guest: { klondike: boards({ moves: 100, seconds: 300, at: null }) } }
    mockStats = statsWith([{ player: null, n: 4 }])
    await render(<RecordsTab profileId={null} gameId={null} />)
    expect(records()).toEqual(['score 400, time 5:00, 100 moves'])
    expect(screen.getByText('Not ranked: some earlier wins weren’t kept')).toBeTruthy()
  })

  it('says there are no wins yet, under the game picked', async () => {
    const { rerender } = await render(<RecordsTab profileId={null} gameId={null} />)
    expect(sectionLabels()).toEqual(['RECORDS'])
    expect(screen.getByText('No wins yet')).toBeTruthy()
    await rerender(<RecordsTab profileId={null} gameId='golf' />)
    expect(sectionLabels()).toEqual(['GOLF'])
  })
})

describe('the achievements across every game', () => {
  it('lists the catalog for the player picked', async () => {
    await render(<SolitaireAchievementList profileId={null} />)
    expect(screen.queryAllByTestId('achievement-row')).toHaveLength(1)
  })
})

describe('Reset, following the player picker', () => {
  it('resets everyone on Everyone, and says so', async () => {
    const { result } = await renderHook(() => statsReset.useReset())
    await act(() => result.current(null))
    expect(mockResetAll).toHaveBeenCalledTimes(1)
    expect(mockPlayerData.resetPlayer).not.toHaveBeenCalled()
    const labels = statsReset.labels(null)
    expect(labels.label).toBe('Reset All Stats')
    expect(labels.title).toBe('Reset Everything?')
    expect(labels.body).toContain("every player's")
  })

  it('resets just the player picked (guest included), and says the totals stay', async () => {
    const { result } = await renderHook(() => statsReset.useReset())
    await act(() => result.current('kid'))
    await act(() => result.current('guest'))
    expect(mockPlayerData.resetPlayer.mock.calls).toEqual([['kid'], ['guest']])
    expect(mockResetAll).not.toHaveBeenCalled()
    const labels = statsReset.labels('Kid')
    expect(labels.label).toBe("Reset Kid's Stats")
    expect(labels.title).toBe('Reset Kid?')
    expect(labels.body).toContain('The totals under Everyone stay')
    expect(statsReset.labels('Guest').label).toBe("Reset Guest's Stats")
  })
})
