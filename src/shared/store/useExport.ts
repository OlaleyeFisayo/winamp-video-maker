import { create } from "zustand"

export type Fps = 30 | 60
/** Short side of the output in pixels: 720p, 1080p, 2K, 4K. */
export type Resolution = 720 | 1080 | 1440 | 2160

type Export = {
  open: boolean
  fps: Fps
  resolution: Resolution
  setOpen: (open: boolean) => void
  setFps: (fps: Fps) => void
  setResolution: (resolution: Resolution) => void
}

export const useExport = create<Export>((set) => ({
  open: false,
  fps: 30,
  resolution: 1080,
  setOpen: (open) => set({ open }),
  setFps: (fps) => set({ fps }),
  setResolution: (resolution) => set({ resolution }),
}))
