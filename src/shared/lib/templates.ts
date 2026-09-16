export type Template = { id: string; name: string; file?: string; url?: string }

const DIR = "/default-templates"

/** The bundled skins. Order matters: the first is the default. */
export const TEMPLATES: readonly Template[] = [
  { id: "sony", name: "Sony", file: "sony-winamp-template.wsz" },
  { id: "windows-xp", name: "Windows XP", file: "Windows_XP.wsz" },
  { id: "windows-98", name: "Windows 98", file: "Windows98.wsz" },
  { id: "winamp-xp-blue", name: "WinAmp XP Blue", file: "WinAmp_XP_v2_-_Blue_Edition__.wsz" },
  { id: "netscape", name: "Netscape", file: "netscape_winamp.wsz" },
  { id: "excel", name: "Excel", file: "Excel_Skin.wsz" },
  { id: "adidas", name: "Adidas", file: "Adidas2-3.wsz" },
  { id: "caesaramp", name: "CaesarAmp", file: "CaesarAmp.wsz" },
]

/** A saved skin carries its own blob URL; a bundled one is a file under /default-templates. */
export const templateUrl = (t: Template) => t.url ?? `${DIR}/${encodeURIComponent(t.file!)}`

export const DEFAULT_TEMPLATE = TEMPLATES[0]

