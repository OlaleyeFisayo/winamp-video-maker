import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"

export type Fps = 30 | 60
/** Short side of the output in pixels: 720p, 1080p, 2K, 4K. */
export type Resolution = 720 | 1080 | 1440 | 2160
export type ExportMode = "all" | "each" | "selected"

export type ExportRequest = {
  mode: ExportMode
  indices: number[]
  fps: Fps
  resolution: Resolution
  /** Draw every workspace track in the playlist window, not just the ones being encoded. */
  fullTracklist: boolean
}

type Export = {
  open: boolean
  fps: Fps
  resolution: Resolution
  mode: ExportMode
  /** Draw the whole workspace tracklist in per-track exports. */
  fullTracklist: boolean
  /** Raw text of the Selected field, e.g. "1-3, 5". */
  selection: string
  running: boolean
  /** Registered by the editor, which owns Webamp; the dialog only calls it. */
  runner: ((req: ExportRequest) => Promise<void>) | null
  setOpen: (open: boolean) => void
  setFps: (fps: Fps) => void
  setResolution: (resolution: Resolution) => void
  setMode: (mode: ExportMode) => void
  setSelection: (selection: string) => void
  setFullTracklist: (fullTracklist: boolean) => void
  setRunning: (running: boolean) => void
  setRunner: (runner: Export["runner"]) => void
}

export const useExport = create<Export>()(
  persist(
    (set) => ({
      open: false,
      fps: 30,
      resolution: 1080,
      mode: "all",
      selection: "",
      fullTracklist: false,
      running: false,
      runner: null,
      setOpen: (open) => set({ open }),
      setFps: (fps) => set({ fps }),
      setResolution: (resolution) => set({ resolution }),
      setMode: (mode) => set({ mode }),
      setSelection: (selection) => set({ selection }),
      setFullTracklist: (fullTracklist) => set({ fullTracklist }),
      setRunning: (running) => set({ running }),
      setRunner: (runner) => set({ runner }),
    }),
    {
      name: key("export"),
      // settings only: a reload mid-run must not come back with the button stuck disabled,
      // and `selection` indexes a playlist that may no longer match
      partialize: (s) => ({ fps: s.fps, resolution: s.resolution, mode: s.mode, fullTracklist: s.fullTracklist }),
    },
  ),
)
