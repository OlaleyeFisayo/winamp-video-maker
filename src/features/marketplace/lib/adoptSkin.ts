import { useTemplate } from "../../../shared/store/useTemplate"
import { useToast } from "../../../shared/store/useToast"
import { saveSkin } from "../../../shared/store/useSavedSkins"
import { stripExt } from "../../../shared/lib/stripExt"
import type { MuseumSkin } from "./museum"

/** A .wsz is a zip; the two-byte check turns away anything else before it is read in full. */
const isZip = async (blob: Blob) => {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  return head[0] === 0x50 && head[1] === 0x4b
}

/**
 * Saves the archive to the local library and selects it. Returns false if it is not a skin:
 * saveSkin parses the archive once to draw its thumbnail, and a zip with no main window art
 * is not a classic skin the renderer can draw.
 */
const adopt = async (id: string, name: string, blob: Blob) => {
  const template = (await isZip(blob)) ? await saveSkin(id, name, blob) : null
  if (!template) {
    useToast.getState().show("That file isn't a Winamp skin.")
    return false
  }
  useTemplate.getState().setId(template.id)
  return true
}

/** Downloads a marketplace skin, saves it to My Skins and makes it the current template. */
export const adoptMuseumSkin = async (skin: MuseumSkin) => {
  const toast = useToast.getState()
  toast.startProgress(`Getting ${skin.name}`)
  try {
    const response = await fetch(skin.downloadUrl)
    if (!response.ok) throw new Error(String(response.status))
    return await adopt(`saved:${skin.md5}`, skin.name, await response.blob())
  } catch {
    toast.show("That skin couldn't be downloaded. Try another.")
    return false
  } finally {
    toast.endProgress()
  }
}

/** Same, for a .wsz the user dropped in. */
export const adoptUploadedSkin = (file: File) =>
  adopt(`saved:${crypto.randomUUID()}`, stripExt(file.name), file)
