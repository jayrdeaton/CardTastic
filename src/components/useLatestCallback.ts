import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A function that keeps its identity across renders and calls the latest `fn` it was given (swapped in after each commit,
 * before anything can call it), or undefined while `fn` is. A component that hands its own callbacks down to memoized
 * children through this lets their memo hold even when its caller passes a fresh closure every render: a Klondike move
 * on an LG Stylo 6 used to re-render every foundation's and the waste's cards on each of its commits for that alone.
 */
export function useLatestCallback<A extends unknown[], R>(fn: ((...args: A) => R) | undefined): ((...args: A) => R) | undefined {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  const stable = useCallback((...args: A) => ref.current!(...args), [])
  return fn ? stable : undefined
}
