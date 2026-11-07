import { ComponentType } from 'react'
import { StyleSheet, View } from 'react-native'
import { Portal } from 'react-native-paper'

import { DealProvider } from '@/components/dealing/DealLayer'
import { DragGhostProvider } from '@/components/dragdrop/DragGhostLayer'
import { HintGlideProvider } from '@/components/hinting/HintGlideLayer'
import { WinCascadeProvider } from '@/components/winning/WinCascadeLayer'

/**
 * Wraps a game's own "Inner" screen component in the providers every game needs, in the
 * same fixed order: DealProvider outermost (the initial-deal animation engine - see
 * components/dealing/DealLayer.tsx), DragGhostProvider next (the Inner component itself calls
 * useDragGhost() to drive its own tap-to-move/drag flights, not just its PileView/DraggableCard
 * children), WinCascadeProvider next. This is every game screen's own entire exported component (each
 * game's `PlayScreen`, games/<id>/definition.ts).
 *
 * DealProvider and DragGhostProvider each render their own screen-level ghost-overlay View as a sibling of
 * `{children}`, filling the screen: the screen starts at the window's origin (the stack draws no header), so a
 * measured window position is a position in those overlays as it is.
 *
 * The Portal.Host sits OUTSIDE the providers, so the game's dialogs (Settings, Rules, the New Game confirm), which
 * render through Paper's Portal, paint above the deal/drag ghost overlays and DealLayer's full-screen skip-tap layer:
 * a Portal.Host draws its portals as a LATER sibling of its children, so a host inside GameChrome would have put them
 * below those (later siblings of Inner).
 *
 * HintGlideProvider (the Hint button's see-through glide, components/hinting/HintGlideLayer.tsx) sits innermost, so its
 * overlay paints over the board but under every real flight's ghost.
 */
export function withGameProviders(Inner: ComponentType): ComponentType {
  return function GameScreen() {
    return (
      <View style={styles.root}>
        <Portal.Host>
          <DealProvider>
            <DragGhostProvider>
              <WinCascadeProvider>
                <HintGlideProvider>
                  <Inner />
                </HintGlideProvider>
              </WinCascadeProvider>
            </DragGhostProvider>
          </DealProvider>
        </Portal.Host>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
