/// <reference lib="webworker" />
import { ArrayBufferTarget, Muxer } from "mp4-muxer"
import { loadSkin } from "./renderer/skin"
import { createRenderer, type Background, type Scene } from "./renderer/compose"
import type { SkinState } from "./renderer/windows"

export type WorkerTrack = {
  title: string
  duration: number
  kbps: number
  sampleRate: number
  channels: Float32Array[]
}

export type StartMessage = {
  type: "start"
  archive: string
  width: number
  height: number
  fps: number
  scale: number
  background: Background
  skin: SkinState
  tracks: WorkerTrack[]
}

export type WorkerOut =
  | { type: "progress"; frames: number }
  | { type: "cancelled" }
  | { type: "done"; buffer: ArrayBuffer }
  | { type: "error"; message: string }

let cancelled = false
const post = (m: WorkerOut, transfer: Transferable[] = []) => self.postMessage(m, transfer)

const avcCodec = (width: number, height: number, fps: number) => {
  const px = width * height
  if (px > 1920 * 1080 || (px > 1280 * 720 && fps > 30)) return "avc1.640033" // level 5.1
  if (fps > 30) return "avc1.64002a" // level 4.2
  return "avc1.640028" // level 4.0
}

const run = async (msg: StartMessage) => {
  const { width, height, fps } = msg
  const sampleRate = msg.tracks[0]?.sampleRate ?? 48000
  const skin = await loadSkin(msg.archive)

  const tracks: Scene["tracks"] = msg.tracks.map((t) => {
    const mono = new Float32Array(t.channels[0].length)
    for (const ch of t.channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / t.channels.length
    return { title: t.title, duration: t.duration, kbps: t.kbps, khz: t.sampleRate / 1000, channels: t.channels.length, mono, sampleRate: t.sampleRate }
  })
  const scene: Scene = { width, height, scale: msg.scale, background: msg.background, skin: msg.skin, tracks }
  const renderer = createRenderer(skin, scene)

  const videoConfig: VideoEncoderConfig = {
    codec: avcCodec(width, height, fps),
    width,
    height,
    framerate: fps,
    bitrate: Math.round((width * height) / (1920 * 1080) * 8_000_000 * (fps > 30 ? 1.5 : 1)),
    avc: { format: "avc" },
  }
  if (!(await VideoEncoder.isConfigSupported(videoConfig)).supported) throw new Error("resolution")
  const audioConfig: AudioEncoderConfig = { codec: "mp4a.40.2", sampleRate, numberOfChannels: 2, bitrate: 128_000 }
  if (!(await AudioEncoder.isConfigSupported(audioConfig)).supported) throw new Error("audio")

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    audio: { codec: "aac", sampleRate, numberOfChannels: 2 },
    fastStart: "in-memory",
  })
  let failure: Error | null = null
  const video = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (failure = e) })
  const audio = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (failure = e) })
  video.configure(videoConfig)
  audio.configure(audioConfig)

  // audio: stereo planar, 1024 frames per AudioData, tracks back to back
  const total = tracks.reduce((a, t) => a + t.duration, 0)
  let sample = 0
  for (const t of msg.tracks) {
    const left = t.channels[0], right = t.channels[1] ?? t.channels[0]
    for (let i = 0; i < left.length; i += 1024) {
      const n = Math.min(1024, left.length - i)
      const data = new Float32Array(n * 2)
      data.set(left.subarray(i, i + n), 0)
      data.set(right.subarray(i, i + n), n)
      audio.encode(new AudioData({ format: "f32-planar", sampleRate, numberOfChannels: 2, numberOfFrames: n, timestamp: Math.round((sample / sampleRate) * 1e6), data }))
      sample += n
      if (cancelled) break
      if (audio.encodeQueueSize > 16) await new Promise((r) => setTimeout(r, 0))
    }
  }

  // video: one frame per tick, keyframe every two seconds
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")!
  const frames = Math.ceil(total * fps)
  const starts = tracks.map((_, i) => tracks.slice(0, i).reduce((a, t) => a + t.duration, 0))
  for (let f = 0; f < frames; f++) {
    if (cancelled || failure) break
    const t = f / fps
    let idx = starts.findIndex((s, i) => t >= s && t < s + tracks[i].duration)
    if (idx < 0) idx = tracks.length - 1
    renderer.render(ctx, idx, t - starts[idx], t)
    const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) })
    video.encode(frame, { keyFrame: f % (fps * 2) === 0 })
    frame.close()
    if (f % 15 === 0) post({ type: "progress", frames: f })
    while (video.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0))
  }
  if (failure) throw failure
  if (cancelled) {
    video.close()
    audio.close()
    post({ type: "cancelled" })
    return
  }

  await Promise.all([video.flush(), audio.flush()])
  muxer.finalize()
  const buffer = (muxer.target as ArrayBufferTarget).buffer
  post({ type: "progress", frames })
  post({ type: "done", buffer }, [buffer])
}

self.onmessage = (e: MessageEvent<StartMessage | { type: "cancel" }>) => {
  if (e.data.type === "cancel") {
    cancelled = true
    return
  }
  run(e.data).catch((err: unknown) => post({ type: "error", message: err instanceof Error ? err.message : String(err) }))
}
