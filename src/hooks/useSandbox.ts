import { useSyncExternalStore, useCallback, useEffect } from "react"

const KEY = "paperpal-sandbox"

const listeners = new Set<() => void>()

function getSnapshot(): boolean {
  return localStorage.getItem(KEY) === "true"
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify() {
  listeners.forEach((cb) => cb())
}

export function useSandbox() {
  const sandbox = useSyncExternalStore(subscribe, getSnapshot)

  // Auto-enable sandbox when ?sandbox=true is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("sandbox") === "true" && !getSnapshot()) {
      localStorage.setItem(KEY, "true")
      notify()
    }
  }, [])

  const setSandbox = useCallback((value: boolean) => {
    if (value) {
      localStorage.setItem(KEY, "true")
    } else {
      localStorage.removeItem(KEY)
    }
    notify()
  }, [])

  return { sandbox, setSandbox }
}
