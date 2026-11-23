import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text, View } from 'react-native'

import { MIN_HERO_HEIGHT, WithSetupHero } from '@/games/shared/SetupHero'

// A setup screen's hero (Jay, 2026-11-21): the game's Home preview over the screen's content, in what height is left over it, and
// gone when that's too little to read.

let mockWindow = { width: 375, height: 812 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ({ ...mockWindow, scale: 3, fontScale: 1 }) }))
jest.mock('@tastic/shell', () => {
  const { View: MockView } = jest.requireActual('react-native')
  return {
    PREVIEW_ASPECT: 1.8,
    usePackGame: (id: string) => ({
      id,
      title: 'Klondike',
      // A preview paints its felt unless told not to (components/previewFelt.ts)
      Preview: ({ width, height }: { width: number; height: number }) => {
        const felt = jest.requireActual('@/components/previewFelt').usePreviewFelt()
        return <MockView testID='preview' nativeID={felt ? 'felt' : 'bare'} style={{ width, height }} />
      }
    }),
    useSeatColors: () => ({ p1Color: '#e91e63', p2Color: '#2196f3' })
  }
})

const styleOf = (testID: string) => Object.assign({}, ...([screen.getByTestId(testID).props.style].flat(Infinity) as object[])) as { width?: number; height?: number; backgroundColor?: string }
const heroHeight = () => styleOf('klondike-hero').height as number

// The content as laid out: the test hands it a height
async function show(contentHeight: number, props: { enabled?: boolean; below?: number } = {}) {
  await render(
    <WithSetupHero game='klondike' enabled={props.enabled ?? true} width={343} below={props.below}>
      <View testID='content'>
        <Text>content</Text>
      </View>
    </WithSetupHero>
  )
  await fireEvent(screen.getByTestId('content').parent!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 343, height: contentHeight } } })
}

beforeEach(() => {
  mockWindow = { width: 375, height: 812 }
})

describe('the setup screen hero', () => {
  it("draws the game's preview at the content's width and the preview's shape when there's room", async () => {
    await show(400)
    // 343 wide at 1.8: 191 tall
    expect(heroHeight()).toBe(191)
    expect(styleOf('preview')).toMatchObject({ width: 344, height: 191 })
  })

  // Jay, 2026-11-23: a card colored like the felt looked bad, and a well asked why it needed one
  it("lays the preview's cards straight on the screen's felt: no card round it and no felt of its own", async () => {
    await show(400)
    expect(styleOf('klondike-hero').backgroundColor).toBeUndefined()
    expect(screen.getByTestId('preview').props.nativeID).toBe('bare')
  })

  it('gives way to the content, down to the height its cards can still be read at', async () => {
    // 812 - 60 header - 48 margin - 24 gap - 560 content = 120
    await show(560)
    expect(heroHeight()).toBe(120)
  })

  it("isn't drawn when there's too little room (a short phone, the rules open, a phone held sideways)", async () => {
    await show(812 - 60 - 48 - 24 - MIN_HERO_HEIGHT + 1)
    expect(screen.queryByTestId('klondike-hero')).toBeNull()
    mockWindow = { width: 874, height: 402 }
    await show(250)
    expect(screen.queryByTestId('klondike-hero')).toBeNull()
  })

  it('leaves room for what the shell draws under the content (READY?)', async () => {
    await show(560, { below: 72 })
    expect(screen.queryByTestId('klondike-hero')).toBeNull()
  })

  it("isn't drawn with two people (their halves fill the screen)", async () => {
    await show(200, { enabled: false })
    expect(screen.queryByTestId('klondike-hero')).toBeNull()
  })
})
