import { create } from "zustand"

/** A row of the skin playlist, mirrored from Webamp. `trim` is merged in by the editor. */
export type Track = {
  id: number
  title: string
  url: string
  duration: number | null
  /** Seconds of the file to keep from its start; null plays the whole thing. */
  trim: number | null
}

export type Status = "PLAYING" | "STOPPED" | "PAUSED"

/** How long a track actually runs: everything that measures a track goes through this. */
export const effectiveDuration = (t: Pick<Track, "duration" | "trim">) =>
  t.trim ?? t.duration ?? 0

/** Intent from the UI; the editor owns Webamp and applies these. */
export type Command =
  /** `ids` names the session-file record each file was stored under, in the same order. */
  | { type: "add"; files: File[]; ids: string[] }
  | { type: "remove"; index: number }
  | { type: "move"; from: number; to: number }
  | { type: "play"; index: number }
  | { type: "rename"; index: number; title: string }
  | { type: "toggle" }
  | { type: "seek"; time: number }
  /** `at` is global timeline time; the editor resolves which track it lands in. */
  | { type: "cut"; at: number }
  | { type: "next" }
  | { type: "previous" }

type Audio = {
  tracks: Track[]
  current: number | null
  status: Status
  /** Seconds elapsed in the current track, mirrored from Webamp. */
  time: number
  /**
   * Trim points by blob URL. Kept here rather than on `Track` because the mirror rebuilds
   * every Track from Webamp on each state change, which would wipe a field set on them.
   * The URL key also survives the reorder rebuild, which remints Webamp's track ids.
   */
  trims: Record<string, number>
  commands: Command[]
  setTracks: (tracks: Track[]) => void
  setCurrent: (index: number | null) => void
  setStatus: (status: Status) => void
  setTime: (time: number) => void
  setTrim: (url: string, seconds: number | null) => void
  /** Drops trims for URLs no longer in the playlist. */
  pruneTrims: (urls: string[]) => void
  enqueue: (command: Command) => void
  clearCommands: () => void
}

export const useAudio = create<Audio>((set) => ({
  tracks: [],
  current: null,
  status: "STOPPED",
  time: 0,
  trims: {},
  commands: [],
  setTracks: (tracks) => set({ tracks }),
  setCurrent: (current) => set({ current }),
  setStatus: (status) => set({ status }),
  setTime: (time) => set({ time }),
  setTrim: (url, seconds) =>
    set((s) => {
      const next = { ...s.trims }
      if (seconds === null) delete next[url]
      else next[url] = seconds
      return { trims: next }
    }),
  pruneTrims: (urls) =>
    set((s) => {
      const live = new Set(urls)
      const kept = Object.entries(s.trims).filter(([url]) => live.has(url))
      return kept.length === Object.keys(s.trims).length ? s : { trims: Object.fromEntries(kept) }
    }),
  enqueue: (command) => set((s) => ({ commands: [...s.commands, command] })),
  // a no-op when already empty, so draining the queue does not itself trigger a render
  clearCommands: () => set((s) => (s.commands.length === 0 ? s : { commands: [] })),
}))

/** Global timeline position of the playhead, or null when nothing is playing. */
export const playheadTime = (s: Pick<Audio, "tracks" | "current" | "time">) => {
  if (s.current === null || !s.tracks[s.current]) return null
  const start = s.tracks.slice(0, s.current).reduce((a, t) => a + effectiveDuration(t), 0)
  return start + Math.min(s.time, effectiveDuration(s.tracks[s.current]))
}

/** Playhead as a 0..1 fraction of the whole timeline, for scrolling a zoomed view. */
export const playheadFraction = (s: Pick<Audio, "tracks" | "current" | "time">) => {
  const total = s.tracks.reduce((a, t) => a + effectiveDuration(t), 0)
  const head = playheadTime(s)
  return total > 0 && head !== null ? head / total : 0
}
