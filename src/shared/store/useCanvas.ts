import { create } from "zustand"

const HEX = /^#[0-9a-f]{6}$/i

type Canvas = {
  /** Fraction of the frame height the skin stack occupies. */
  scale: number
  /** Frame background, always #RRGGBB upper case. */
  color: string
  setScale: (scale: number) => void
  setColor: (hex: string) => void
}

export const useCanvas = create<Canvas>((set) => ({
  scale: 0.7,
  color: "#FFFFFF",
  setScale: (scale) => set({ scale: Math.min(1, Math.max(0.1, scale)) }),
  setColor: (hex) => {
    if (HEX.test(hex)) set({ color: hex.toUpperCase() })
  },
}))
