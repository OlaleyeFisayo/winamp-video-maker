import { create } from "zustand"

export const ZOOM_MIN = 1
export const ZOOM_MAX = 50
const STEP = 1.3

const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

type TimelineZoom = {
  /** 1 fits the whole playlist in the panel; higher spreads it out. */
  zoom: number
  setZoom: (zoom: number) => void
  in: () => void
  out: () => void
  fit: () => void
}

/** A view of the current session, like the preview flag, so it is not persisted. */
export const useTimelineZoom = create<TimelineZoom>((set) => ({
  zoom: ZOOM_MIN,
  setZoom: (zoom) => set({ zoom: clamp(zoom) }),
  in: () => set((s) => ({ zoom: clamp(s.zoom * STEP) })),
  out: () => set((s) => ({ zoom: clamp(s.zoom / STEP) })),
  fit: () => set({ zoom: ZOOM_MIN }),
}))
