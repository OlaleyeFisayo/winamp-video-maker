export type PresetId = "16:9" | "9:16" | "1:1" | "4:5"

export type Preset = { id: PresetId; width: number; height: number; hint: string }

export const PRESETS: readonly Preset[] = [
  { id: "16:9", width: 1920, height: 1080, hint: "YouTube" },
  { id: "9:16", width: 1080, height: 1920, hint: "Reels, TikTok, Shorts" },
  { id: "1:1", width: 1080, height: 1080, hint: "Square" },
  { id: "4:5", width: 1080, height: 1350, hint: "Feed" },
]

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** 1500 × 1000 -> "3:2" */
export const ratioLabel = (width: number, height: number) => {
  const g = gcd(width, height) || 1
  return `${width / g}:${height / g}`
}

type Size = { width: number; height: number }

/** Scales a ratio so its short side equals `shortSide`; both sides rounded to even numbers for encoders. */
export const exportSize = ({ width, height }: Size, shortSide: number): Size => {
  const scale = shortSide / Math.min(width, height)
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}
