/**
 * Classic Winamp 2 skin geometry, as Webamp lays it out. Source rects index the sprite
 * sheets in the .wsz; positions are where they land in a 275x116 window.
 */
export type Rect = { x: number; y: number; w: number; h: number }
const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

export const WIN_W = 275
export const WIN_H = 116

export const SHEETS = [
  "main.bmp", "titlebar.bmp", "cbuttons.bmp", "numbers.bmp", "nums_ex.bmp", "text.bmp", "posbar.bmp",
  "playpaus.bmp", "monoster.bmp", "volume.bmp", "balance.bmp", "shufrep.bmp", "eqmain.bmp", "pledit.bmp",
  "pledit.txt", "viscolor.txt",
] as const

export const MAIN = {
  titleBar: r(27, 0, 275, 14),
  buttons: [
    { src: r(0, 0, 23, 18), at: [16, 88] },
    { src: r(23, 0, 23, 18), at: [39, 88] },
    { src: r(46, 0, 23, 18), at: [62, 88] },
    { src: r(69, 0, 23, 18), at: [85, 88] },
    { src: r(92, 0, 22, 18), at: [108, 88] },
    { src: r(114, 0, 22, 16), at: [136, 89] },
  ] as { src: Rect; at: [number, number] }[],
  digit: (n: number) => r(n * 9, 0, 9, 13),
  digitsAt: [
    [48, 26],
    [60, 26],
    [78, 26],
    [90, 26],
  ] as [number, number][],
  marquee: { x: 111, y: 24, w: 154, chars: 30 },
  kbps: [111, 43] as [number, number],
  khz: [156, 43] as [number, number],
  vis: r(24, 43, 76, 16),
  posBg: { src: r(0, 0, 248, 10), at: [16, 72] as [number, number] },
  posThumb: r(248, 0, 29, 10),
  indicator: { play: r(0, 0, 9, 9), pause: r(9, 0, 9, 9), stop: r(18, 0, 9, 9), at: [26, 28] as [number, number] },
  stereo: { on: r(0, 0, 29, 12), off: r(0, 12, 29, 12), at: [239, 41] as [number, number] },
  mono: { on: r(29, 0, 27, 12), off: r(29, 12, 27, 12), at: [212, 41] as [number, number] },
  volume: { at: [107, 57] as [number, number], w: 68, frameH: 15, frames: 28, thumb: r(15, 422, 14, 11) },
  balance: { at: [177, 57] as [number, number], srcX: 9, w: 38, frameH: 15, frames: 28, thumb: r(15, 422, 14, 11) },
  shuffle: { off: r(28, 0, 47, 15), on: r(28, 30, 47, 15), at: [164, 89] as [number, number] },
  repeat: { off: r(0, 0, 28, 15), on: r(0, 30, 28, 15), at: [210, 89] as [number, number] },
  eqButton: { off: r(0, 61, 23, 12), on: r(0, 73, 23, 12), at: [219, 58] as [number, number] },
  plButton: { off: r(23, 61, 23, 12), on: r(23, 73, 23, 12), at: [242, 58] as [number, number] },
}

export const EQ = {
  titleBar: r(0, 134, 275, 14),
  on: { off: r(10, 119, 26, 12), on: r(69, 119, 26, 12), at: [14, 18] as [number, number] },
  auto: { off: r(36, 119, 32, 12), on: r(95, 119, 32, 12), at: [40, 18] as [number, number] },
  presets: { src: r(224, 164, 44, 12), at: [217, 18] as [number, number] },
  graph: { bg: r(0, 294, 113, 19), colors: r(115, 294, 1, 19), at: [86, 17] as [number, number] },
  thumb: r(0, 164, 11, 11),
  sliderTop: 38,
  sliderTravel: 52,
  preampX: 21,
  bandX: [78, 96, 114, 132, 150, 168, 186, 204, 222, 240],
  bandKeys: ["60", "170", "310", "600", "1000", "3000", "6000", "12000", "14000", "16000"],
}

export const PL = {
  topLeft: r(0, 0, 25, 20),
  topTile: r(127, 0, 25, 20),
  title: r(26, 0, 100, 20),
  topRight: r(153, 0, 25, 20),
  leftTile: r(0, 42, 12, 29),
  rightTile: r(31, 42, 20, 29),
  bottomLeft: r(0, 72, 125, 38),
  bottomRight: r(126, 72, 150, 38),
  list: { x: 12, y: 20, w: 243, h: 58, row: 13 },
  miniTime: [191, 101] as [number, number],
}

/** Where each character sits in text.bmp, as [row, column] of 5x6 cells. */
export const FONT: Record<string, [number, number]> = {}
"abcdefghijklmnopqrstuvwxyz".split("").forEach((c, i) => (FONT[c] = [0, i]))
FONT['"'] = [0, 26]
FONT["@"] = [0, 27]
FONT[" "] = [0, 30]
"0123456789".split("").forEach((c, i) => (FONT[c] = [1, i]))
;["…", ".", ":", "(", ")", "-", "'", "!", "_", "+", "\\", "/", "[", "]", "^", "&", "%", ",", "=", "$", "#"].forEach(
  (c, i) => (FONT[c] = [1, 10 + i]),
)
FONT["<"] = [1, 22]
FONT[">"] = [1, 23]
FONT["{"] = [1, 22]
FONT["}"] = [1, 23]
;["å", "ö", "ä", "?", "*"].forEach((c, i) => (FONT[c] = [2, i]))
export const CHAR_W = 5
export const CHAR_H = 6
