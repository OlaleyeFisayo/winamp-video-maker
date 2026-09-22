import type Webamp from "webamp"
import { useAudio } from "../../../shared/store/useAudio"
import { IMAGE_KEY, restoreBackground } from "../../../shared/store/useCanvas"
import { clearExcept, deleteFile, getFile, listKeys } from "../../../shared/lib/sessionFiles"
import { buildManifest, readManifest, writeManifest, type ManifestEntry } from "../../../shared/lib/trackManifest"

/**
 * Maps a playlist row's blob URL to the session file it came from. Webamp mints the URL when
 * a track is appended, so this is filled in right after every append — on a restore and on a
 * fresh add alike. It is the join the manifest is rebuilt through.
 */
const fileIds = new Map<string, { id: string; blob: Blob }>()
let ready = false

/** The stored-file id and bytes behind a playlist row's blob URL, if it was appended through here. */
export const fileFor = (url: string) => fileIds.get(url)

/** IndexedDB key for a track's cached waveform peaks; lives and dies with the track's bytes. */
export const peaksKey = (id: string) => `peaks:${id}`

let lastManifest = ""

/** Called after Webamp finishes a mutation, including an append or a remove/rebuild. */
export const saveSession = (webamp: Webamp, current: number | null) => {
  if (!ready) return
  const trims = useAudio.getState().trims
  const rows = webamp.getPlaylistTracks().map((t) => ({
    url: t.url,
    title: t.title ?? t.defaultName ?? "Untitled",
    trim: trims[t.url] ?? null,
  }))
  const manifest = buildManifest(rows, fileIds, current === null ? undefined : rows[current]?.url)
  // localStorage writes are synchronous; a mirror update that changed nothing skips the write
  const json = JSON.stringify(manifest)
  if (json !== lastManifest) {
    lastManifest = json
    writeManifest(manifest)
  }
  const live = new Set(rows.map((t) => t.url))
  useAudio.getState().pruneTrims([...live])
  for (const [url, { id }] of fileIds) {
    if (!live.has(url)) {
      fileIds.delete(url)
      void deleteFile(id)
      void deleteFile(peaksKey(id))
    }
  }
}

/** Records the ids and bytes for the rows Webamp just appended, in append order. */
export const trackAppended = (webamp: Webamp, ids: string[], blobs: Blob[]) => {
  const rows = webamp.getPlaylistTracks()
  const added = rows.slice(rows.length - ids.length)
  added.forEach((row, i) => {
    if (row.url) fileIds.set(row.url, { id: ids[i], blob: blobs[i] })
  })
}

/**
 * Rebuilds last session's playlist. Append-only and silent: nothing auto-plays, and a track
 * whose bytes are gone is simply skipped.
 *
 * ponytail: the skin's own settings (volume, balance, EQ, visualiser, shuffle, repeat, which
 * windows are open) are read-only through webamp's middleware, so they reset to the skin's
 * defaults. Restoring them needs new dispatches through captureStore in webamp.ts.
 */
// ponytail: StrictMode mounts the editor effect twice and renderOnce hands both the same
// promise, so without this the playlist is appended — and doubled — on every reload
let restored: Promise<void> | undefined

export const restoreSession = (webamp: Webamp) => (restored ??= restoreOnce(webamp))

const restoreOnce = async (webamp: Webamp) => {
  const manifest = readManifest()
  // Prune before reading, in one transaction, so later uploads cannot be swept away.
  // Saved skins are keyed `skin:` and are not session files — they outlive the playlist.
  const [skins, thumbs] = await Promise.all([listKeys("skin:"), listKeys("thumb:")])
  await clearExcept([IMAGE_KEY, ...skins, ...thumbs, ...manifest.flatMap((t) => [t.id, peaksKey(t.id)])])
  // nothing below needs the background; it lands whenever it lands
  void restoreBackground()

  // independent reads, so they go out together instead of one round trip per track
  const stored = await Promise.all(manifest.map((entry) => getFile(entry.id)))
  const found: (ManifestEntry & { blob: Blob })[] = []
  manifest.forEach((entry, i) => {
    const blob = stored[i]?.blob
    if (blob instanceof Blob) found.push({ ...entry, blob })
  })
  if (found.length) {
    webamp.appendTracks(found.map((t) => ({ blob: t.blob, metaData: { title: t.title, artist: "" } })))
    trackAppended(webamp, found.map((t) => t.id), found.map((t) => t.blob))
    // the trim is keyed by the blob URL webamp just minted, so it is re-applied after the append
    const appended = webamp.getPlaylistTracks()
    found.forEach((t, i) => {
      const url = appended[i]?.url
      if (url && typeof t.trim === "number") useAudio.getState().setTrim(url, t.trim)
    })
    const selected = found.findIndex((t) => t.selected === true)
    if (selected !== -1) webamp.setCurrentTrack(webamp.getPlaylistTracks()[selected].id)
  }
  ready = true
}
