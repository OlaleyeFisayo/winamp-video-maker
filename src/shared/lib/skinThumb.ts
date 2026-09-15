import { readEntries } from "./zip"

/** Object URL for the skin's main window art, or null when it cannot be read. */
export const skinThumbUrl = async (archive: ArrayBuffer): Promise<string | null> => {
  try {
    const bmp = (await readEntries(archive, ["main.bmp"])).get("main.bmp")
    if (!bmp || bmp[0] !== 0x42 || bmp[1] !== 0x4d) return null
    return URL.createObjectURL(new Blob([bmp as BlobPart], { type: "image/bmp" }))
  } catch {
    return null
  }
}
