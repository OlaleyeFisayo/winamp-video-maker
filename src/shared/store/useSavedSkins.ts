import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"
import { deleteFile, getFile, putFile } from "../lib/sessionFiles"
import { skinThumbUrl } from "../lib/skinThumb"
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

/** Writes the archive to IndexedDB and registers the skin. Returns it as a Template. */
export const saveSkin = async (id: string, name: string, blob: Blob): Promise<Template> => {
  await putFile(skinKey(id), blob, name)
  const url = URL.createObjectURL(blob)
  const store = useSavedSkins.getState()
  store.add({ id, name })
  store.setUrl(id, url)
  void blob.arrayBuffer().then(async (buffer) => {
    const thumb = await skinThumbUrl(buffer)
    if (thumb) useSavedSkins.getState().setThumb(id, thumb)
  })
  return { id, name, url }
}

export const removeSavedSkin = async (id: string) => {
  useSavedSkins.getState().remove(id)
  await deleteFile(skinKey(id))
}

/** Rebuilds blob URLs and thumbnails for every saved skin. Called once on boot. */
export const hydrateSavedSkins = async () => {
  for (const skin of useSavedSkins.getState().skins) {
    if (useSavedSkins.getState().urls[skin.id]) continue
    const stored = await getFile(skinKey(skin.id))
    if (!(stored?.blob instanceof Blob)) {
      // the bytes are gone; drop the orphaned entry rather than show a skin that cannot load
      useSavedSkins.getState().remove(skin.id)
      // and do not leave the editor pointing at a skin that will never resolve
      const template = useTemplate.getState()
      if (template.id === skin.id) template.setId(DEFAULT_TEMPLATE.id)
      continue
    }
    useSavedSkins.getState().setUrl(skin.id, URL.createObjectURL(stored.blob))
    const thumb = await skinThumbUrl(await stored.blob.arrayBuffer())
    if (thumb) useSavedSkins.getState().setThumb(skin.id, thumb)
  }
}
