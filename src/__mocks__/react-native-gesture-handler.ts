const makeGesture = () => {
  const g: any = {}
  g.onUpdate = () => g
  g.onEnd = () => g
  g.onStart = () => g
  g.onChange = () => g
  // RatSlap's touch zones (games/ratslap/RatSlapScreen.tsx).
  g.minDistance = () => g
  g.maxPointers = () => g
  g.enabled = () => g
  g.onBegin = () => g
  return g
}

module.exports = {
  State: { ACTIVE: 'ACTIVE', END: 'END' },
  Gesture: {
    Pan: () => makeGesture(),
    Simultaneous: (..._gs: any[]) => makeGesture()
  },
  GestureDetector: ({ children }: any) => children,
  GestureHandlerRootView: ({ children }: any) => children
}
