/** Hue 0-360, saturation and lightness 0-100. */
export type Hsl = { h: number; s: number; l: number }

export type Rgb = { r: number; g: number; b: number }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** "#RRGGBB" -> { r, g, b }, each 0-255. */
export const hexToRgb = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** { r, g, b } -> "#RRGGBB" upper case, which is the only shape useCanvas accepts. */
export const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase()

export const hexToHsl = (hex: string): Hsl => {
  const { r, g, b } = hexToRgb(hex)
  const [rd, gd, bd] = [r / 255, g / 255, b / 255]
  const max = Math.max(rd, gd, bd)
  const min = Math.min(rd, gd, bd)
  const span = max - min
  const l = (max + min) / 2

  // a grey has no hue to measure; 0 keeps the rails somewhere sensible
  if (span === 0) return { h: 0, s: 0, l: l * 100 }

  const s = span / (1 - Math.abs(2 * l - 1))
  const h =
    max === rd
      ? ((gd - bd) / span + (gd < bd ? 6 : 0)) * 60
      : max === gd
        ? ((bd - rd) / span + 2) * 60
        : ((rd - gd) / span + 4) * 60

  // unrounded: an integer H/S/L cannot address every 8-bit colour, so rounding here
  // would shift the picked colour. Round at the readout instead.
  return { h: h % 360, s: s * 100, l: l * 100 }
}

export const hslToHex = ({ h, s, l }: Hsl): string => {
  const sd = clamp(s, 0, 100) / 100
  const ld = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * ld - 1)) * sd
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = ld - c / 2
  const [r, g, b] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
             [c, 0, x]
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}
