import { create } from "zustand"

const HEX = /^#[0-9a-f]{6}$/i

export type BackgroundMode = "color" | "image" | "transparent"
export type Fit = "cover" | "contain"

type Canvas = {
  /** Fraction of the frame height the skin stack occupies. */
  scale: number
  /** What sits behind the skin. */
  mode: BackgroundMode
  /** Frame colour, always #RRGGBB upper case. Kept across modes so it can come back. */
  color: string
  /** Object URL of the background image, or null. */
  image: string | null
  imageName: string | null
  fit: Fit
  setScale: (scale: number) => void
  setMode: (mode: BackgroundMode) => void
  setColor: (hex: string) => void
  setImage: (file: File | null) => void
  setFit: (fit: Fit) => void
}

export const useCanvas = create<Canvas>((set) => ({
  scale: 0.5,
  mode: "color",
  color: "#FFFFFF",
  image: null,
  imageName: null,
  fit: "cover",
  setScale: (scale) => set({ scale: Math.min(1, Math.max(0.1, scale)) }),
  setMode: (mode) => set({ mode }),
  setColor: (hex) => {
    if (HEX.test(hex)) set({ color: hex.toUpperCase() })
  },
  setImage: (file) =>
    set((s) => {
      // the previous blob is ours to release; nothing else holds a reference
      if (s.image) URL.revokeObjectURL(s.image)
      return file
        ? { image: URL.createObjectURL(file), imageName: file.name }
        : { image: null, imageName: null }
    }),
  setFit: (fit) => set({ fit }),
}))
