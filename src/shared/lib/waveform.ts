import { decodeTrack } from "./export/audio"

/** Peaks per track. Enough detail for a timeline block a few hundred pixels wide. */
export const BUCKETS = 400

/**
 * Reduces a track to one normalised peak per bucket, for drawing its waveform.
 *
 * ponytail: peaks, not samples. Decoded PCM is tens of MB a track and the timeline needs a few
 * hundred numbers, so the decoded buffers are dropped as soon as this returns. Raise BUCKETS if
 * the blocks ever get wide enough to show the seams.
 */
export const trackPeaks = async (url: string): Promise<Float32Array> => {
  const { channels } = await decodeTrack(url, "")
  const samples = channels[0]
  const peaks = new Float32Array(BUCKETS)
  if (!samples?.length) return peaks

  const per = samples.length / BUCKETS
  let loudest = 0
  for (let b = 0; b < BUCKETS; b++) {
    const start = Math.floor(b * per)
    // the last bucket takes the remainder, so no samples are dropped to rounding
    const end = b === BUCKETS - 1 ? samples.length : Math.floor((b + 1) * per)
    let peak = 0
    for (let i = start; i < end; i++) {
      const v = samples[i] < 0 ? -samples[i] : samples[i]
      if (v > peak) peak = v
    }
    peaks[b] = peak
    if (peak > loudest) loudest = peak
  }

  // normalised against the track's own loudest point, so a quiet recording is still legible
  if (loudest > 0) for (let b = 0; b < BUCKETS; b++) peaks[b] /= loudest
  return peaks
}
