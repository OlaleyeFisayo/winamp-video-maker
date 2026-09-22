import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"
import { deleteFile, getFile, putFile } from "../lib/sessionFiles"
import { skinThumbUrl, thumbKey } from "../lib/skinThumb"
import { DEFAULT_TEMPLATE, TEMPLATES, type Template } from "../lib/templates"
import { useTemplate } from "./useTemplate"

/**
 * Skins the user took from the marketplace or uploaded. The metadata is small JSON and
 * lives here in localStorage; the archive bytes live in IndexedDB under `skin:<id>`.
 *
 * ponytail: no quota management. Skins are ~100-300KB and IndexedDB gives us far more
 * than that; add eviction if anyone ever fills it.
 */

export type SavedSkin = { id: string; name: string }

/** IndexedDB key for a saved skin's archive. */
export const skinKey = (id: string) => `skin:${id}`

type Store = {
  skins: SavedSkin[]
  /** Blob URLs for the archives, rebuilt from IndexedDB on boot. */
  urls: Record<string, string>
  thumbs: Record<string, string>
  add: (skin: SavedSkin) => void
  remove: (id: string) => void
  setUrl: (id: string, url: string) => void
  setThumb: (id: string, url: string) => void
}

export const useSavedSkins = create<Store>()(
  persist(
    (set) => ({
      skins: [],
      urls: {},
      thumbs: {},
      add: (skin) =>
        set((s) => ({ skins: s.skins.some((x) => x.id === skin.id) ? s.skins : [skin, ...s.skins] })),
      remove: (id) =>
        set((s) => ({
          skins: s.skins.filter((x) => x.id !== id),
          urls: Object.fromEntries(Object.entries(s.urls).filter(([k]) => k !== id)),
          thumbs: Object.fromEntries(Object.entries(s.thumbs).filter(([k]) => k !== id)),
        })),
      setUrl: (id, url) => set((s) => ({ urls: { ...s.urls, [id]: url } })),
      setThumb: (id, url) => set((s) => ({ thumbs: { ...s.thumbs, [id]: url } })),
    }),
    {
      name: key("saved-skins"),
      // urls and thumbs are blob URLs: dead on reload, rebuilt by hydrateSavedSkins
      partialize: (s) => ({ skins: s.skins }),
    },
  ),
)

/** The saved skin as the editor's loader wants it, or undefined until its blob URL exists. */
export const savedTemplate = (id: string): Template | undefined => {
  const { skins, urls } = useSavedSkins.getState()
  const skin = skins.find((s) => s.id === id)
  const url = urls[id]
  return skin && url ? { id: skin.id, name: skin.name, url } : undefined
}

/**
 * Resolves an id to the skin to load: a bundled one, else a saved marketplace/uploaded one.
 * Undefined means "not loadable yet" — a saved skin whose blob URL has not been rebuilt.
 */
export const findTemplate = (id: string): Template | undefined =>
  TEMPLATES.find((t) => t.id === id) ?? savedTemplate(id)

/**
 * Writes the archive to IndexedDB and registers the skin. Returns it as a Template, or null
 * when the archive is not a classic skin — decided by whether a thumbnail can be drawn from it,
 * which is the same parse the picker needs anyway.
 */
export const saveSkin = async (id: string, name: string, blob: Blob): Promise<Template | null> => {
  const thumb = await skinThumbUrl(id, () => blob.arrayBuffer())
  if (!thumb) return null
  await putFile(skinKey(id), blob, name)
  const url = URL.createObjectURL(blob)
  const store = useSavedSkins.getState()
  store.add({ id, name })
  store.setUrl(id, url)
  store.setThumb(id, thumb)
  return { id, name, url }
}

export const removeSavedSkin = async (id: string) => {
  useSavedSkins.getState().remove(id)
  await Promise.all([deleteFile(skinKey(id)), deleteFile(thumbKey(id))])
}

/** Rebuilds blob URLs and thumbnails for every saved skin. Called once on boot. */
export const hydrateSavedSkins = async () => {
  const skins = useSavedSkins.getState().skins.filter((s) => !useSavedSkins.getState().urls[s.id])
  // all the reads at once: they are independent, and IndexedDB pipelines them
  const stored = await Promise.all(skins.map((s) => getFile(skinKey(s.id))))
  const urls: Record<string, string> = {}
  const live: { id: string; blob: Blob }[] = []
  skins.forEach((skin, i) => {
    const blob = stored[i]?.blob
    if (blob instanceof Blob) {
      urls[skin.id] = URL.createObjectURL(blob)
      live.push({ id: skin.id, blob })
      return
    }
    // the bytes are gone; drop the orphaned entry rather than show a skin that cannot load
    useSavedSkins.getState().remove(skin.id)
    // and do not leave the editor pointing at a skin that will never resolve
    const template = useTemplate.getState()
    if (template.id === skin.id) template.setId(DEFAULT_TEMPLATE.id)
  })
  if (live.length) useSavedSkins.setState((s) => ({ urls: { ...s.urls, ...urls } }))
  // thumbnails come from the cache after the first visit; a miss is rendered in the worker
  for (const { id, blob } of live) {
    const thumb = await skinThumbUrl(id, () => blob.arrayBuffer())
    if (thumb) useSavedSkins.getState().setThumb(id, thumb)
  }
}
