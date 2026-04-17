import { useEffect, useRef, useCallback, useState } from "react"

const DEBOUNCE_MS = 2000

export function useDraft<T>(key: string, skip = false) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const load = useCallback((): T | null => {
    if (skip) return null
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }, [key, skip])

  const save = useCallback(
    (data: T) => {
      if (skip) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(data))
          setLastSaved(new Date())
        } catch {
          // localStorage full or unavailable
        }
      }, DEBOUNCE_MS)
    },
    [key, skip]
  )

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(key)
    setLastSaved(null)
  }, [key])

  const hasDraft = useCallback((): boolean => {
    if (skip) return false
    return localStorage.getItem(key) !== null
  }, [key, skip])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { load, save, clear, hasDraft, lastSaved }
}
