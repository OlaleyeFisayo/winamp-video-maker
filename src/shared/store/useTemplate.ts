import { create } from "zustand"
import { DEFAULT_TEMPLATE } from "../lib/templates"

type TemplateStore = {
  /** Id of the chosen skin; the editor loads it into Webamp. */
  id: string
  /** Thumbnails built from the downloaded archives, keyed by template id. */
  thumbs: Record<string, string>
  setId: (id: string) => void
  setThumb: (id: string, url: string) => void
}

export const useTemplate = create<TemplateStore>((set) => ({
  id: DEFAULT_TEMPLATE.id,
  thumbs: {},
  setId: (id) => set({ id }),
  setThumb: (id, url) => set((s) => ({ thumbs: { ...s.thumbs, [id]: url } })),
}))
