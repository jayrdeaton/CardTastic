// Small hooks every two-player table screen uses.

import { useCallback, useEffect, useState } from 'react'
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native'

/** The table's size, from its own box rather than the window (on the web the window's reading can lag a resize). Pass
 * `onLayout` to the table's root view. */
export function useTableSize(): { width: number; height: number; onLayout: (e: LayoutChangeEvent) => void } {
  const window = useWindowDimensions()
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }))
  }, [])
  return { width: size?.width ?? window.width, height: size?.height ?? window.height, onLayout }
}

/** True once `key` has stayed the same for `delayMs` (false again the moment it changes): cards done dealing, a hole's
 * cards turned over long enough to read before its scores show. Null never settles. */
export function useSettled(key: string | number | null, delayMs: number): boolean {
  const [settled, setSettled] = useState<string | number | null>(null)
  useEffect(() => {
    if (key === null) return
    const timer = setTimeout(() => setSettled(key), delayMs)
    return () => clearTimeout(timer)
  }, [key, delayMs])
  return key !== null && settled === key
}
