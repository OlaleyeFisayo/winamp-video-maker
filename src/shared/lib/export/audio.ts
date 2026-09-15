/** Decoded track audio, ready to transfer to a worker. */
export type DecodedTrack = {
  title: string
  sampleRate: number
  channels: Float32Array[]
  duration: number
  /** Rounded bitrate for the skin's kbps readout. */
  kbps: number
}

/**
 * Decodes a track's audio on the main thread. decodeAudioData runs on the browser's
 * own audio thread, so the app stays responsive; only the copy into PCM touches ours.
 */
export const decodeTrack = async (url: string, title: string): Promise<DecodedTrack> => {
  const bytes = await (await fetch(url)).arrayBuffer()
  const size = bytes.byteLength
  const ctx = new OfflineAudioContext(2, 1, 48000)
  const buffer = await ctx.decodeAudioData(bytes)
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  return {
    title,
    sampleRate: buffer.sampleRate,
    channels,
    duration: buffer.duration,
    kbps: Math.round((size * 8) / buffer.duration / 1000),
  }
}

/** Everything transferable in a decoded track, for postMessage. */
export const transferables = (t: DecodedTrack) => t.channels.map((c) => c.buffer)
