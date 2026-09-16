import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"
import { DEFAULT_TEMPLATE } from "../lib/templates"

type TemplateStore = {
  /** Id of the chosen skin; the editor loads it into Webamp. */
  id: string
  /** Thumbnails built from the downloaded archives, keyed by template id. */
  thumbs: Record<string, string>
  /** Blob URL of the current skin archive, for the export worker to read sprites from. */
  archive: string | null
  setId: (id: string) => void
  setThumb: (id: string, url: string) => void
  setArchive: (url: string | null) => void
}

export const useTemplate = create<TemplateStore>()(
  persist(
    (set) => ({
      id: DEFAULT_TEMPLATE.id,
      thumbs: {},
      archive: null,
      setId: (id) => set({ id }),
      setThumb: (id, url) => set((s) => ({ thumbs: { ...s.thumbs, [id]: url } })),
      setArchive: (archive) => set({ archive }),
    }),
    {
      name: key("template"),
      // the id is enough: thumbs and archive are blob URLs, refetched from /public on boot
      partialize: (s) => ({ id: s.id }),
      // a saved marketplace id is not in TEMPLATES and its store may not have hydrated yet,
      // so any non-empty id is kept here; the editor falls back if it cannot resolve it
      merge: (stored, current) => {
        const id = (stored as { id?: string } | null)?.id
        return { ...current, id: id || current.id }
      },
    },
  ),
)
