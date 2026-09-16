import Webamp from "webamp"
import { useToast } from "../../../shared/store/useToast"
import { useTemplate } from "../../../shared/store/useTemplate"
import { DEFAULT_TEMPLATE, TEMPLATES, templateUrl, type Template } from "../../../shared/lib/templates"
import { findTemplate } from "../../../shared/store/useSavedSkins"
import { skinThumbUrl } from "../../../shared/lib/skinThumb"

type Action = { type: string; absolute?: boolean }
type Dispatch = (action: object) => unknown
type GetState = () => {
  media?: { timeElapsed?: number; volume?: number; balance?: number; shuffle?: boolean; repeat?: boolean }
  playlist?: { trackOrder: number[]; currentTrack: number | null }
  equalizer?: { on: boolean; auto: boolean; sliders: Record<string, number> }
  display?: { visualizerStyle?: number }
  windows?: { genWindows?: Record<string, { open: boolean; shade?: boolean }> }
}
type Middleware = (store: { dispatch: Dispatch; getState: GetState }) => (next: (a: Action) => unknown) => (action: Action) => unknown

/**
 * Lets the initial layout and the one-time centring through, then drops every
 * drag (relative position update) and resize so the skin stays where the editor put it.
 */
const lockWindows = (): Middleware => {
  let centred = false
  return () => (next) => (action) => {
    if (action.type === "UPDATE_WINDOW_POSITIONS") {
      if (action.absolute) centred = true
      else if (centred) return action
    }
    if (action.type === "WINDOW_SIZE_CHANGED" && centred) return action
    return next(action)
  }
}

// ponytail: no public rename API; the middleware hands us the store dispatch
let dispatch: Dispatch | undefined
let getState: GetState | undefined
const captureStore: Middleware = (store) => {
  dispatch = store.dispatch
  getState = store.getState
  return (next) => (action) => next(action)
}

/** Everything the export renderer needs to draw the skin the way it looks right now. */
export const snapshotSkinState = () => {
  const s = getState?.() ?? {}
  const win = (id: string) => s.windows?.genWindows?.[id]?.open ?? false
  return {
    volume: s.media?.volume ?? 50,
    balance: s.media?.balance ?? 0,
    eq: { on: s.equalizer?.on ?? false, auto: s.equalizer?.auto ?? false, sliders: s.equalizer?.sliders ?? {} },
    vis: s.display?.visualizerStyle ?? 0,
    shuffle: s.media?.shuffle ?? false,
    repeat: s.media?.repeat ?? false,
    windows: { main: win("main"), equalizer: win("equalizer"), playlist: win("playlist") },
  }
}

/** Seconds elapsed in the current track. */
export const getElapsed = () => getState?.().media?.timeElapsed ?? 0

/** Index of the current track in playlist order, kept through pause and stop; null when none. */
export const getCurrentIndex = () => {
  const pl = getState?.().playlist
  if (!pl || pl.currentTrack === null) return null
  const i = pl.trackOrder.indexOf(pl.currentTrack)
  return i < 0 ? null : i
}

/**
 * Scrolls the skin playlist so row `index` is visible and selects it.
 * Selecting replaces any manual multi-selection in the skin; that is the price of a clear active row.
 */
export const revealTrack = (index: number, count: number) => {
  dispatch?.({ type: "CLICKED_TRACK", index })
  dispatch?.({
    type: "SET_PLAYLIST_SCROLL_POSITION",
    position: count > 1 ? Math.round((100 * index) / (count - 1)) : 0,
  })
}

/** Renames a playlist track in place. Clears the artist tag, which Webamp would otherwise prefix. */
export const renameTrack = (id: number, title: string) =>
  dispatch?.({ type: "SET_MEDIA_TAGS", id, title, artist: "" })

// ponytail: webamp cannot be disposed cleanly; one instance for the app lifetime
let instance: Webamp | undefined
let rendered: Promise<void> | undefined

export const getWebamp = () => {
  if (instance) return instance
  // ponytail: webamp calls the global alert for unsupported menu items and skin errors
  window.alert = (message?: unknown) =>
    useToast
      .getState()
      .show(String(message) === "Not supported in Webamp" ? "That action isn't supported here." : String(message))
  instance = new Webamp({
    initialSkin: { url: templateUrl(findTemplate(useTemplate.getState().id) ?? DEFAULT_TEMPLATE) },
    windowLayout: {
      main: { position: { top: 0, left: 0 } },
      equalizer: { position: { top: 116, left: 0 } },
      playlist: { position: { top: 232, left: 0 } },
    },
    zIndex: 1,
    __customMiddlewares: [lockWindows(), captureStore],
  })
  // ponytail: Close would hide the player; the editor has no closed state
  instance.onWillClose((cancel) => cancel())
  return instance
}

/** Downloaded skins, kept so re-picking one is instant. */
const cache = new Map<string, string>()

/**
 * Downloads every skin once so the picker can show real art before anything is chosen.
 * Sequential and quiet: nothing is waiting on it, and one at a time keeps it out of the way
 * of whatever the user is actually doing. The blobs double as the pick-it-later cache.
 */
export const prefetchSkins = async () => {
  for (const template of TEMPLATES) {
    await primeSkin(template)
  }
}

/** Builds the thumbnail for a skin already on screen. No progress notice: nothing is waiting on it. */
export const primeSkin = async (template: Template) => {
  if (cache.has(template.id)) return
  try {
    const response = await fetch(templateUrl(template))
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    cache.set(template.id, url)
    if (useTemplate.getState().id === template.id) useTemplate.getState().setArchive(url)
    const thumb = await skinThumbUrl(await blob.arrayBuffer())
    if (thumb) useTemplate.getState().setThumb(template.id, thumb)
  } catch {
    // a missing thumbnail is cosmetic; the skin itself is already loaded
  }
}

/** Fetches a skin with byte progress, caches the blob, and hands it to Webamp. */
export const loadSkin = async (template: Template) => {
  const webamp = getWebamp()
  const cached = cache.get(template.id)
  if (cached) {
    webamp.setSkinFromUrl(cached)
    useTemplate.getState().setArchive(cached)
    return webamp.skinIsLoaded()
  }

  const toast = useToast.getState()
  toast.startProgress(`Loading ${template.name}`)
  try {
    const response = await fetch(templateUrl(template))
    if (!response.ok || !response.body) throw new Error(String(response.status))

    const total = Number(response.headers.get("content-length")) || 0
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      // without a length header there is nothing honest to show, so hold at zero
      if (total) toast.setProgress((received / total) * 100)
    }

    const blob = new Blob(chunks as BlobPart[], { type: "application/zip" })
    const url = URL.createObjectURL(blob)
    cache.set(template.id, url)

    void blob.arrayBuffer().then(async (buffer) => {
      const thumb = await skinThumbUrl(buffer)
      if (thumb) useTemplate.getState().setThumb(template.id, thumb)
    })

    webamp.setSkinFromUrl(url)
    useTemplate.getState().setArchive(url)
    await webamp.skinIsLoaded()
  } catch {
    toast.show("That template couldn't load. Try another.")
  } finally {
    toast.endProgress()
  }
}

/** Renders into `node` the first time only; StrictMode double effects reuse the same promise. */
export const renderOnce = (node: HTMLElement) => (rendered ??= getWebamp().renderInto(node))

/** Empties the skin playlist without touching playback state; used to rebuild it after a removal. */
export const clearPlaylist = () => dispatch?.({ type: "REMOVE_ALL_TRACKS" })
