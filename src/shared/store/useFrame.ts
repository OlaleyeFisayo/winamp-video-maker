import { create } from "zustand"
import { PRESETS, type PresetId } from "../lib/presets"

export const SIZE_MIN = 16
export const SIZE_MAX = 7680

type Size = { width: number; height: number }

type Frame = {
  ratio: PresetId | "custom"
  custom: Size
  setRatio: (ratio: PresetId | "custom") => void
  setCustom: (size: Partial<Size>) => void
}

const clamp = (n: number) => Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(n)))

export const useFrame = create<Frame>((set) => ({
  ratio: "16:9",
  custom: { width: 1920, height: 1080 },
  setRatio: (ratio) => set({ ratio }),
  setCustom: (size) =>
    set((s) => ({
      custom: {
        width: size.width == null ? s.custom.width : clamp(size.width),
        height: size.height == null ? s.custom.height : clamp(size.height),
      },
    })),
}))

/** The export size the frame currently represents. */
export const frameSize = (s: Pick<Frame, "ratio" | "custom">): Size =>
  s.ratio === "custom" ? s.custom : PRESETS.find((p) => p.id === s.ratio)!
