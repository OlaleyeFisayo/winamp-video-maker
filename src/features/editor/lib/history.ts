import { create } from "zustand"
import { useAudio } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { useFrame } from "../../../shared/store/useFrame"
import { useTemplate } from "../../../shared/store/useTemplate"
import { putFile } from "../../../shared/lib/sessionFiles"
import { clearPlaylist, getCurrentIndex, getWebamp, renameTrack } from "./webamp"
import { fileFor, saveSession, trackAppended } from "./restoreSession"

/**
 * Undo/redo as a stack of whole-workspace snapshots. Recorded by watching the stores rather than
 * by instrumenting every setter: a change to any of them schedules a snapshot, and the debounce
 * folds a slider drag or a colour-picker sweep into one step.
 *
 * ponytail: 300ms debounce also merges two distinct actions made inside that window into one
 * step; switch to explicit commits from each setter if that ever bites.
 */

type Row = { id: string; blob: Blob; title: string; trim: number | null }

type Snapshot = {
  template: string
  frame: { ratio: ReturnType<typeof useFrame.getState>["ratio"]; custom: { width: number; height: number } }
  canvas: {
    scale: number
    mode: ReturnType<typeof useCanvas.getState>["mode"]
    color: string
    fit: ReturnType<typeof useCanvas.getState>["fit"]
    image: string | null
    imageName: string | null
    imageFile: Blob | null
  }
  playlist: Row[]
}

type History = { past: Snapshot[]; present: Snapshot | null; future: Snapshot[] }

const LIMIT = 100
const DEBOUNCE = 300

export const useHistory = create<History>(() => ({ past: [], present: null, future: [] }))

const take = (): Snapshot => {
  const { ratio, custom } = useFrame.getState()
  const { scale, mode, color, fit, image, imageName, imageFile } = useCanvas.getState()
  const trims = useAudio.getState().trims
  const playlist: Row[] = []
  for (const t of getWebamp().getPlaylistTracks()) {
    const file = fileFor(t.url)
    // a row with no bytes behind it cannot be brought back, so it is not history either
    if (!file) continue
    playlist.push({ ...file, title: t.title ?? t.defaultName ?? "Untitled", trim: trims[t.url] ?? null })
  }
  return {
    template: useTemplate.getState().id,
    frame: { ratio, custom },
    canvas: { scale, mode, color, fit, image, imageName, imageFile },
    playlist,
  }
}

/** Everything that tells two snapshots apart, minus the bytes. */
const key = (s: Snapshot) =>
  JSON.stringify({
    ...s,
    canvas: { ...s.canvas, imageFile: undefined },
    playlist: s.playlist.map(({ id, title, trim }) => ({ id, title, trim })),
  })

// while an undo/redo is being applied the stores change too; those echoes are not new steps
let applying = false
let timer: number | undefined

const record = () => {
  // a change made while an undo settles is picked up on the next pass instead of being lost
  if (applying) return schedule()
  const { past, present } = useHistory.getState()
  const next = take()
  if (!present) return useHistory.setState({ present: next })
  if (key(next) === key(present)) return
  useHistory.setState({ past: [...past, present].slice(-LIMIT), present: next, future: [] })
}

const schedule = () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(record, DEBOUNCE)
}

/** Holds off recording until the echoes of a programmatic change have settled. */
const quiet = (body: () => void) => {
  applying = true
  try {
    body()
  } finally {
    window.setTimeout(() => {
      applying = false
    }, DEBOUNCE + 100)
  }
}

const applyPlaylist = (rows: Row[]) => {
  const webamp = getWebamp()
  const audio = useAudio.getState()
  const live = webamp.getPlaylistTracks()
  const byId = new Map(live.map((t) => [fileFor(t.url)?.id, t]))
  const sameOrder = live.length === rows.length && rows.every((r, i) => r.id === fileFor(live[i].url)?.id)
  if (sameOrder) {
    // nothing moved: patch titles and trims in place so playback carries on
    live.forEach((t, i) => {
      if ((t.title ?? t.defaultName ?? "Untitled") !== rows[i].title) renameTrack(t.id, rows[i].title)
      audio.setTrim(t.url, rows[i].trim)
    })
  } else {
    webamp.stop()
    clearPlaylist()
    webamp.appendTracks(
      rows.map((r) => {
        const kept = byId.get(r.id)
        const metaData = { title: r.title, artist: "" }
        // a row still in the playlist keeps its blob URL, and with it its waveform and trim key
        return kept ? { url: kept.url, duration: kept.duration ?? undefined, metaData } : { blob: r.blob, metaData }
      }),
    )
    // saveSession pruned the bytes of a removed row, so a row coming back is stored again
    rows.forEach((r) => {
      if (!byId.has(r.id)) void putFile(r.id, r.blob)
    })
    trackAppended(webamp, rows.map((r) => r.id), rows.map((r) => r.blob))
    webamp.getPlaylistTracks().forEach((t, i) => audio.setTrim(t.url, rows[i]?.trim ?? null))
  }
  queueMicrotask(() => saveSession(webamp, getCurrentIndex()))
}

const apply = (s: Snapshot) =>
  quiet(() => {
    useTemplate.getState().setId(s.template)
    useFrame.setState(s.frame)
    const { scale, mode, color, fit, imageFile, imageName } = s.canvas
    useCanvas.setState({ scale, mode, color, fit })
    useCanvas.getState().setImage(imageFile, imageName ?? undefined)
    applyPlaylist(s.playlist)
    // a fresh take: the image and any re-added rows now have new blob URLs
    useHistory.setState({ present: take() })
  })

export const undo = () => {
  const { past, present, future } = useHistory.getState()
  const prev = past.at(-1)
  if (!prev || !present) return
  useHistory.setState({ past: past.slice(0, -1), future: [present, ...future] })
  apply(prev)
}

export const redo = () => {
  const { past, present, future } = useHistory.getState()
  const [next, ...rest] = future
  if (!next || !present) return
  useHistory.setState({ past: [...past, present], future: rest })
  apply(next)
}

/** Forgets every step and takes the current workspace as the new baseline. */
export const clearHistory = () =>
  quiet(() => useHistory.setState({ past: [], present: take(), future: [] }))

let started = false

/** Starts watching once the session has been restored, so the restore itself is not a step. */
export const startHistory = () => {
  if (started) return
  started = true
  useHistory.setState({ present: take() })
  useTemplate.subscribe((s, p) => s.id !== p.id && schedule())
  useFrame.subscribe(schedule)
  useCanvas.subscribe(schedule)
  useAudio.subscribe((s, p) => (s.tracks !== p.tracks || s.trims !== p.trims) && schedule())
}
