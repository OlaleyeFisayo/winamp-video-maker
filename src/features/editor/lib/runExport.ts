import { useAudio } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { useExport, type ExportRequest } from "../../../shared/store/useExport"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { DEFAULT_NAME, useProject } from "../../../shared/store/useProject"
import { useTemplate } from "../../../shared/store/useTemplate"
import { useToast } from "../../../shared/store/useToast"
import { exportSize } from "../../../shared/lib/presets"
import { decodeTrack, transferables, type DecodedTrack } from "../../../shared/lib/export/audio"
import type { StartMessage, WorkerOut } from "../../../shared/lib/export/export.worker"
import { snapshotSkinState } from "./webamp"

const supported = () =>
  typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined" && typeof OfflineAudioContext !== "undefined"

const TRANSPARENCY_ERROR = "Transparent WebM export isn't supported here. Try Chrome or Edge, or choose a colour or image background."

// characters Windows and macOS refuse in file names; the backslash is built by code to dodge escaping
const BAD_CHARS = new RegExp(`[${"\\"}/:*?"<>|]+`, "g")
const safeName = (s: string) => s.replace(BAD_CHARS, "-").replace(/\s+/g, " ").trim() || "video"

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

type Segment = { name: string; trackIndices: number[] }

/** Renders each segment in its own worker and downloads the result. Registered into useExport by the editor. */
export const runExport = async (req: ExportRequest) => {
  const toast = useToast.getState()
  if (!supported()) {
    toast.show(useCanvas.getState().mode === "transparent" ? TRANSPARENCY_ERROR : "Export needs a recent Chrome, Edge or Safari.")
    return
  }
  const audio = useAudio.getState()
  const archive = useTemplate.getState().archive
  if (!archive) {
    toast.show("The template is still loading. Try again in a moment.")
    return
  }
  if (audio.status === "PLAYING") audio.enqueue({ type: "toggle" })
  useExport.getState().setRunning(true)

  const workers: Worker[] = []
  let cancelled = false
  const cancel = () => {
    cancelled = true
    workers.forEach((w) => w.postMessage({ type: "cancel" }))
  }

  try {
    const project = useProject.getState().name.trim() || DEFAULT_NAME
    const segments: Segment[] =
      req.mode === "all"
        ? [{ name: project, trackIndices: req.indices.map((n) => n - 1) }]
        : req.indices.map((n) => ({ name: audio.tracks[n - 1].title, trackIndices: [n - 1] }))

    toast.startProgress(`Exporting ${segments[0].name}`, cancel)

    // decode once per distinct track; decodeAudioData runs on the browser's audio thread
    const needed = [...new Set(segments.flatMap((s) => s.trackIndices))]
    const decoded = new Map<number, DecodedTrack>()
    for (const i of needed) {
      if (cancelled) throw new Error("cancelled")
      decoded.set(i, await decodeTrack(audio.tracks[i].url, audio.tracks[i].title))
    }

    const canvas = useCanvas.getState()
    const image = canvas.mode === "image" && canvas.image ? await createImageBitmap(await (await fetch(canvas.image)).blob()) : null
    const { width, height } = exportSize(frameSize(useFrame.getState()), req.resolution)
    const skin = snapshotSkinState()

    const totalFrames = segments.reduce(
      (a, s) => a + Math.ceil(s.trackIndices.reduce((d, i) => d + decoded.get(i)!.duration, 0) * req.fps),
      0,
    )
    const done = new Map<number, number>()
    const report = () => {
      const frames = [...done.values()].reduce((a, b) => a + b, 0)
      toast.setProgress((frames / Math.max(1, totalFrames)) * 100)
    }

    const runSegment = (seg: Segment, index: number) =>
      new Promise<void>((resolve, reject) => {
        const worker = new Worker(new URL("../../../shared/lib/export/export.worker.ts", import.meta.url), { type: "module" })
        workers.push(worker)
        const tracks = seg.trackIndices.map((i) => decoded.get(i)!)
        const msg: StartMessage = {
          type: "start",
          archive,
          width,
          height,
          fps: req.fps,
          scale: canvas.scale,
          background: { mode: canvas.mode, color: canvas.color, image, fit: canvas.fit },
          skin,
          tracks: tracks.map((t) => ({ title: t.title, duration: t.duration, kbps: t.kbps, sampleRate: t.sampleRate, channels: t.channels })),
        }
        worker.onmessage = (e: MessageEvent<WorkerOut>) => {
          const m = e.data
          if (m.type === "progress") {
            done.set(index, m.frames)
            report()
          } else if (m.type === "done") {
            if (!cancelled) download(new Blob([m.buffer], { type: `video/${m.format}` }), `${safeName(seg.name)}.${m.format}`)
            worker.terminate()
            resolve()
          } else if (m.type === "cancelled") {
            worker.terminate()
            resolve()
          } else if (m.type === "error") {
            worker.terminate()
            reject(new Error(m.message))
          }
        }
        worker.onerror = (e) => {
          worker.terminate()
          reject(new Error(e.message))
        }
        // channels are copied per segment, so a track shared by two segments keeps its data here
        const copies = tracks.map((t) => ({ ...t, channels: t.channels.map((c) => c.slice()) }))
        msg.tracks = copies.map((t) => ({ title: t.title, duration: t.duration, kbps: t.kbps, sampleRate: t.sampleRate, channels: t.channels }))
        worker.postMessage(msg, copies.flatMap(transferables))
      })

    // a few segments at a time; hardware encoders do not scale past that anyway
    const lanes = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1, segments.length))
    let next = 0
    let finished = 0
    const lane = async () => {
      while (next < segments.length && !cancelled) {
        const i = next++
        await runSegment(segments[i], i)
        finished++
        if (segments.length > 1 && finished < segments.length) {
          toast.setProgressLabel(`Exporting ${finished + 1} of ${segments.length} · ${segments[Math.min(next, segments.length - 1)].name}`)
        }
      }
    }
    await Promise.all(Array.from({ length: lanes }, lane))
    if (cancelled) toast.show("Export was cancelled.")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === "cancelled") toast.show("Export was cancelled.")
    else if (msg === "transparency") toast.show(TRANSPARENCY_ERROR)
    else if (msg === "resolution") toast.show("That resolution isn't supported here. Try 1080p.")
    else toast.show("Export failed.")
  } finally {
    workers.forEach((w) => w.terminate())
    toast.endProgress()
    useExport.getState().setRunning(false)
  }
}
