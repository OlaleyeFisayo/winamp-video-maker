import { readEntries } from "../../zip"
import { SHEETS } from "./sprites"

export type Sheets = Partial<Record<(typeof SHEETS)[number], ImageBitmap>>

export type PleditColors = { normal: string; current: string; normalBg: string; selectedBg: string; font: string }

export type Skin = { sheets: Sheets; visColors: string[]; pledit: PleditColors }

const parseIni = (text: string) => {
  const out: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^;=[]+?)\s*=\s*(.+?)\s*$/.exec(line)
    if (m) out[m[1].toLowerCase()] = m[2]
  }
  return out
}

const parseVisColors = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((l) => {
      const [r, g, b] = l.split(",").map((n) => Number(n.trim()) || 0)
      return `rgb(${r},${g},${b})`
    })

/** Loads every sheet the renderer uses from .wsz bytes. Missing optional sheets are skipped. */
export const loadSkinFromBuffer = async (buffer: ArrayBuffer): Promise<Skin> => {
  const entries = await readEntries(buffer, [...SHEETS])
  const sheets: Sheets = {}
  const text = new TextDecoder("latin1")

  for (const name of SHEETS) {
    const bytes = entries.get(name)
    if (!bytes || name.endsWith(".txt")) continue
    try {
      sheets[name] = await createImageBitmap(new Blob([bytes as BlobPart], { type: "image/bmp" }))
    } catch {
      // a skin may ship a sheet the decoder rejects; the renderer treats it as missing
    }
  }
  if (!sheets["numbers.bmp"] && sheets["nums_ex.bmp"]) sheets["numbers.bmp"] = sheets["nums_ex.bmp"]

  const vis = entries.get("viscolor.txt")
  const visColors = vis ? parseVisColors(text.decode(vis)) : []
  while (visColors.length < 24) visColors.push(visColors[visColors.length - 1] ?? "rgb(0,0,0)")

  const ini = parseIni(entries.get("pledit.txt") ? text.decode(entries.get("pledit.txt")!) : "")
  const pledit: PleditColors = {
    normal: ini.normal ?? "#00FF00",
    current: ini.current ?? "#FFFFFF",
    normalBg: ini.normalbg ?? "#000000",
    selectedBg: ini.selectedbg ?? "#0000C6",
    font: ini.font ?? "Arial",
  }
  return { sheets, visColors, pledit }
}

/** Same, from a .wsz archive URL. */
export const loadSkin = async (archiveUrl: string): Promise<Skin> =>
  loadSkinFromBuffer(await (await fetch(archiveUrl)).arrayBuffer())
