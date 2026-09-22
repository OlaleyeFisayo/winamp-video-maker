/// <reference lib="webworker" />
import { ArrayBufferTarget, Muxer } from "mp4-muxer"
import { AudioSample, AudioSampleSource, BufferTarget, CanvasSource, Output, Quality, WebMOutputFormat, canEncodeAudio, canEncodeVideo } from "mediabunny"
import { loadSkin } from "./renderer/skin"
import { createRenderer, type Background, type Scene } from "./renderer/compose"
import type { SkinState, TrackInfo } from "./renderer/windows"

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
  /** The audio to encode. Drives the video's length and the visualiser. */
  tracks: WorkerTrack[]
  /**
   * Rows to draw in the playlist window when they differ from the tracks being encoded, so a
   * single-track export can still show the whole workspace. `offset` is where `tracks` starts
   * within them. Absent means the encoded tracks are the playlist, as before.
   */
  playlist?: { tracks: TrackInfo[]; offset: number }
}

export type WorkerOut =
  | { type: "progress"; frames: number }
  | { type: "cancelled" }
  | { type: "done"; buffer: ArrayBuffer; format: "mp4" | "webm" }
  | { type: "error"; message: string }

let cancelled = false
const post = (m: WorkerOut, transfer: Transferable[] = []) => self.postMessage(m, transfer)

const avcCodec = (width: number, height: number, fps: number) => {
  const px = width * height
  if (px > 1920 * 1080 || (px > 1280 * 720 && fps > 30)) return "avc1.640033" // level 5.1
  if (fps > 30) return "avc1.64002a" // level 4.2
  return "avc1.640028" // level 4.0
}

const runTransparent = async (msg: StartMessage, canvas: OffscreenCanvas, renderFrame: (f: number) => void, frames: number) => {
  const sampleRate = msg.tracks[0].sampleRate
  // Lossless quantization keeps fully transparent pixels at alpha zero.
  const quality = new Quality({ quantizer: 0 })
  if (!(await canEncodeVideo("vp9", { width: msg.width, height: msg.height, quality, alpha: "keep" })) ||
      !(await canEncodeAudio("opus", { sampleRate, numberOfChannels: 2 }))) {
    throw new Error("transparency")
  }

  const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() })
  const video = new CanvasSource(canvas, { codec: "vp9", quality, alpha: "keep", keyFrameInterval: 2 })
  const audio = new AudioSampleSource({ codec: "opus", quality: new Quality({ bitrate: 128_000 }) })
  output.addVideoTrack(video, { frameRate: msg.fps })
  output.addAudioTrack(audio)
  try {
    await output.start()
    let sample = 0
    for (const track of msg.tracks) {
      if (cancelled) break
      const left = track.channels[0], right = track.channels[1] ?? left
      for (let i = 0; i < left.length && !cancelled; i += 1024) {
        const n = Math.min(1024, left.length - i)
        const data = new Float32Array(n * 2)
        data.set(left.subarray(i, i + n))
        data.set(right.subarray(i, i + n), n)
        const chunk = new AudioSample({ format: "f32-planar", sampleRate, numberOfChannels: 2, timestamp: sample / sampleRate, data })
        try { await audio.add(chunk) } finally { chunk.close() }
        sample += n
      }
    }
    audio.close()
    for (let f = 0; f < frames && !cancelled; f++) {
      renderFrame(f)
      await video.add(f / msg.fps, 1 / msg.fps)
      if (f % 15 === 0) {
        post({ type: "progress", frames: f })
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    if (cancelled) {
      post({ type: "cancelled" })
      return
    }
    video.close()
    await output.finalize()
    if (cancelled) {
      post({ type: "cancelled" })
      return
    }
    const buffer = output.target.buffer!
    post({ type: "progress", frames })
    post({ type: "done", buffer, format: "webm" }, [buffer])
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotSupportedError") throw new Error("transparency", { cause: err })
    throw err
  } finally {
    if (output.state !== "finalized") await output.cancel()
  }
}

const run = async (msg: StartMessage) => {
  const { width, height, fps } = msg
  const sampleRate = msg.tracks[0]?.sampleRate ?? 48000
  const skin = await loadSkin(msg.archive)

  // the mono mix only feeds the visualiser; with it off (vis 2) the pass over every sample is skipped
  const needMono = msg.skin.vis !== 2
  const tracks: Scene["tracks"] = msg.tracks.map((t) => {
    let mono = new Float32Array(0)
    if (needMono) {
      mono = new Float32Array(t.channels[0].length)
      const gain = 1 / t.channels.length
      for (const ch of t.channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] * gain
    }
    return { title: t.title, duration: t.duration, kbps: t.kbps, khz: t.sampleRate / 1000, channels: t.channels.length, mono, sampleRate: t.sampleRate }
  })
  // `tracks` alone drives length and timing below; `playlist` only changes what is drawn
  const scene: Scene = { width, height, scale: msg.scale, background: msg.background, skin: msg.skin, tracks, playlist: msg.playlist }
  const renderer = createRenderer(skin, scene)
  const total = tracks.reduce((a, t) => a + t.duration, 0)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d", { alpha: true })!
  const frames = Math.ceil(total * fps)
  const starts = tracks.map((_, i) => tracks.slice(0, i).reduce((a, t) => a + t.duration, 0))
  const renderFrame = (f: number) => {
    const t = f / fps
    let idx = starts.findIndex((s, i) => t >= s && t < s + tracks[i].duration)
    if (idx < 0) idx = tracks.length - 1
    renderer.render(ctx, idx, t - starts[idx])
  }
  if (msg.background.mode === "transparent") return runTransparent(msg, canvas, renderFrame, frames)

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
  for (let f = 0; f < frames; f++) {
    if (cancelled || failure) break
    const t = f / fps
    renderFrame(f)
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
  post({ type: "done", buffer, format: "mp4" }, [buffer])
}

self.onmessage = (e: MessageEvent<StartMessage | { type: "cancel" }>) => {
  if (e.data.type === "cancel") {
    cancelled = true
    return
  }
  run(e.data).catch((err: unknown) => post({ type: "error", message: err instanceof Error ? err.message : String(err) }))
}
