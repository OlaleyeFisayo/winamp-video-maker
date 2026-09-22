import { create } from "zustand"
import { trackPeaks } from "../lib/waveform"
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

/**
 * Decodes whatever the playlist has gained since last time, one track at a time — decoding is
 * cheap but not free, and serialising keeps the editor responsive when ten files are dropped at
 * once. A track that will not decode simply has no waveform.
 *
 * Keyed by URL rather than track id: the reorder rebuild remints webamp's ids, and re-decoding
 * every track on every drag would be wasteful.
 */
export const hydrateWaveforms = async () => {
  const tracks = useAudio.getState().tracks
  useWaveforms.getState().prune(tracks.map((t) => t.url))
  for (const { url } of tracks) {
    if (!url || inFlight.has(url) || useWaveforms.getState().peaks[url]) continue
    inFlight.add(url)
    try {
      const peaks = await trackPeaks(url)
      // the track may have been removed while it decoded
      if (useAudio.getState().tracks.some((t) => t.url === url)) useWaveforms.getState().set(url, peaks)
    } catch {
      // no waveform for this one; the block just stays plain
    } finally {
      inFlight.delete(url)
    }
  }
}
