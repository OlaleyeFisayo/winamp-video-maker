import { create } from "zustand"

type Preview = {
  /** Fullscreen, view-only playback of the composition. */
  active: boolean
  setActive: (active: boolean) => void
  toggle: () => void
}

export const usePreview = create<Preview>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
  toggle: () => set((s) => ({ active: !s.active })),
}))
