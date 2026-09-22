import { create } from "zustand"
import { key, lazyStorage } from "../lib/storageKeys"
import { createJSONStorage, persist } from "zustand/middleware"
import { deleteFile, getFile, putFile } from "../lib/sessionFiles"

const HEX = /^#[0-9a-f]{6}$/i
let imageRevision = 0

/** Key the background image lives under in the session file store. */
export const IMAGE_KEY = "background"

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
  /** The bytes behind `image`, so undo can bring a replaced image back. Not persisted. */
  imageFile: Blob | null
  fit: Fit
  setScale: (scale: number) => void
  setMode: (mode: BackgroundMode) => void
  setColor: (hex: string) => void
  setImage: (file: Blob | null, name?: string) => void
  setFit: (fit: Fit) => void
}

export const useCanvas = create<Canvas>()(
  persist(
    (set) => ({
      scale: 0.5,
      mode: "color",
      color: "#FFFFFF",
      image: null,
      imageName: null,
      imageFile: null,
      fit: "cover",
      setScale: (scale) => set({ scale: Math.min(1, Math.max(0.1, scale)) }),
      setMode: (mode) => set({ mode }),
      setColor: (hex) => {
        if (HEX.test(hex)) set({ color: hex.toUpperCase() })
      },
      setImage: (file, name) => {
        imageRevision++
        set((s) => {
          if (file === s.imageFile) return s
          // the previous blob is ours to release; nothing else holds a reference
          if (s.image) URL.revokeObjectURL(s.image)
          const imageName = name ?? (file as File | null)?.name ?? ""
          // keep the bytes too, so the image survives a reload
          void (file ? putFile(IMAGE_KEY, file, imageName) : deleteFile(IMAGE_KEY))
          return file
            ? { image: URL.createObjectURL(file), imageName, imageFile: file }
            : { image: null, imageName: null, imageFile: null }
        })
      },
      setFit: (fit) => set({ fit }),
    }),
    {
      name: key("canvas"),
      storage: createJSONStorage(() => lazyStorage),
      // the image is bytes, not JSON: it lives in the session file store and comes back
      // through restoreBackground below
      partialize: (s) => ({ scale: s.scale, mode: s.mode, color: s.color, fit: s.fit }),
    },
  ),
)

/** Re-attaches the stored background image after a reload. Safe to call more than once. */
export const restoreBackground = async () => {
  if (useCanvas.getState().image) return
  const revision = imageRevision
  const stored = await getFile(IMAGE_KEY)
  if (!(stored?.blob instanceof Blob) || revision !== imageRevision || useCanvas.getState().image) return
  useCanvas.setState({ image: URL.createObjectURL(stored.blob), imageName: stored.name, imageFile: stored.blob })
}
