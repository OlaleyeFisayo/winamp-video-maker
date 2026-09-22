import { create } from "zustand"
import { trackPeaks } from "../lib/waveform"
import { getFile, putFile } from "../lib/sessionFiles"
import { useAudio } from "./useAudio"

type Waveforms = {
  /** Normalised peaks per track, keyed by the track's blob URL. */
  peaks: Record<string, Float32Array>
  set: (url: string, peaks: Float32Array) => void
  /** Drops everything not in `urls`, so a removed track stops costing memory. */
  prune: (urls: string[]) => void
}

export const useWaveforms = create<Waveforms>((set) => ({
  peaks: {},
  set: (url, peaks) => set((s) => ({ peaks: { ...s.peaks, [url]: peaks } })),
  prune: (urls) =>
    set((s) => {
      const live = new Set(urls)
      const kept = Object.entries(s.peaks).filter(([url]) => live.has(url))
      return kept.length === Object.keys(s.peaks).length ? s : { peaks: Object.fromEntries(kept) }
    }),
}))

/** URLs already decoding, so a track is never decoded twice. */
const inFlight = new Set<string>()

/** Peaks cached under `key` in the session file store, or null when there are none. */
const cachedPeaks = async (key: string) => {
  const stored = await getFile(key)
  if (!(stored?.blob instanceof Blob)) return null
  const bytes = await stored.blob.arrayBuffer()
  return bytes.byteLength % 4 === 0 && bytes.byteLength > 0 ? new Float32Array(bytes) : null
}

/**
 * Decodes whatever the playlist has gained since last time, one track at a time — decoding is
 * cheap but not free, and serialising keeps the editor responsive when ten files are dropped at
 * once. A track that will not decode simply has no waveform.
 *
 * Keyed by URL rather than track id: the reorder rebuild remints webamp's ids, and re-decoding
 * every track on every drag would be wasteful. `cacheKey` maps a URL to a durable store key
 * (the track's file id) so a reload or an undo that re-appends a file never decodes it again.
 */
export const hydrateWaveforms = async (cacheKey: (url: string) => string | undefined) => {
  const tracks = useAudio.getState().tracks
  useWaveforms.getState().prune(tracks.map((t) => t.url))
  for (const { url } of tracks) {
    if (!url || inFlight.has(url) || useWaveforms.getState().peaks[url]) continue
    inFlight.add(url)
    try {
      const key = cacheKey(url)
      let peaks: Float32Array | null = key ? await cachedPeaks(key) : null
      if (!peaks) {
        peaks = await trackPeaks(url)
        if (key) void putFile(key, new Blob([peaks as BlobPart]), "peaks")
      }
      // the track may have been removed while it decoded
      if (useAudio.getState().tracks.some((t) => t.url === url)) useWaveforms.getState().set(url, peaks)
    } catch {
      // no waveform for this one; the block just stays plain
    } finally {
      inFlight.delete(url)
    }
  }
}
