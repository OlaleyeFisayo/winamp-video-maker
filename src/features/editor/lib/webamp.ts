import Webamp from "webamp"
import { useToast } from "../../../shared/store/useToast"

type Action = { type: string; absolute?: boolean }
type Dispatch = (action: object) => unknown
type GetState = () => {
  media?: { timeElapsed?: number }
  playlist?: { trackOrder: number[]; currentTrack: number | null }
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
    initialSkin: { url: "/default-templates/sony-winamp-template.wsz" },
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

/** Renders into `node` the first time only; StrictMode double effects reuse the same promise. */
export const renderOnce = (node: HTMLElement) => (rendered ??= getWebamp().renderInto(node))

/** Empties the skin playlist without touching playback state; used to rebuild it after a removal. */
export const clearPlaylist = () => dispatch?.({ type: "REMOVE_ALL_TRACKS" })
