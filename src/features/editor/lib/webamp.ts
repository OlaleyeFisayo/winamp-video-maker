import Webamp from "webamp"

type Action = { type: string; absolute?: boolean }
type Dispatch = (action: object) => unknown
type Middleware = (store: { dispatch: Dispatch }) => (next: (a: Action) => unknown) => (action: Action) => unknown

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
const captureStore: Middleware = (store) => {
  dispatch = store.dispatch
  return (next) => (action) => next(action)
}

/** Renames a playlist track in place. Clears the artist tag, which Webamp would otherwise prefix. */
export const renameTrack = (id: number, title: string) =>
  dispatch?.({ type: "SET_MEDIA_TAGS", id, title, artist: "" })

// ponytail: webamp cannot be disposed cleanly; one instance for the app lifetime
let instance: Webamp | undefined
let rendered: Promise<void> | undefined

export const getWebamp = () => {
  if (instance) return instance
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
