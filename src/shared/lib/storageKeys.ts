import type { StateStorage } from "zustand/middleware"

/** Prefix for everything the app persists to localStorage. */
export const PREFIX = "winamp-video-maker-"

export const key = (name: string) => PREFIX + name

const DELAY = 250
const pending = new Map<string, string>()
let timer: number | undefined

const flush = () => {
  window.clearTimeout(timer)
  timer = undefined
  for (const [k, v] of pending) {
    try {
      localStorage.setItem(k, v)
    } catch {
      // a full or blocked localStorage costs the persistence, not the session
    }
  }
  pending.clear()
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flush)

/**
 * localStorage with writes coalesced per key and deferred a beat. localStorage.setItem is
 * synchronous, and a slider drag or colour sweep sets state on every pointer move; this turns
 * sixty writes a second into one, and flushes whatever is left when the page goes away.
 */
export const lazyStorage: StateStorage = {
  getItem: (name) => pending.get(name) ?? localStorage.getItem(name),
  setItem: (name, value) => {
    pending.set(name, value)
    timer ??= window.setTimeout(flush, DELAY)
  },
  removeItem: (name) => {
    pending.delete(name)
    localStorage.removeItem(name)
  },
}
