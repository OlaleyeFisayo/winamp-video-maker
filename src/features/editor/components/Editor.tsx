import { useEffect, useRef, useState } from "react"
import Webamp from "webamp"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { useElementSize } from "../../../shared/lib/useElementSize"
import { useTemplate } from "../../../shared/store/useTemplate"
import { usePreview } from "../../../shared/store/usePreview"
import { TEMPLATES } from "../../../shared/lib/templates"
import { cn } from "../../../shared/lib/cn"
import { stripExt } from "../../../shared/lib/stripExt"
import { putFile } from "../../../shared/lib/sessionFiles"
import { clearPlaylist, getCurrentIndex, getElapsed, getWebamp, loadSkin, prefetchSkins, renameTrack, renderOnce, revealTrack } from "../lib/webamp"
import { useShortcuts } from "../lib/useShortcuts"
import { restoreSession, saveSession, trackAppended } from "../lib/restoreSession"
import { runExport } from "../lib/runExport"
import { useExport } from "../../../shared/store/useExport"
import { Timeline } from "./Timeline"
import { Transport } from "./Transport"

const supported = Webamp.browserIsSupported()

/** Skin stack size at 1x: main, equalizer and playlist windows, 275 wide, 116 tall each. */
const SKIN_W = 275
const SKIN_H = 348

const toBlobTrack = (file: File) => ({
  blob: file,
  metaData: { title: stripExt(file.name), artist: "" },
})

const toUrlTrack = (t: Track) => ({
  url: t.url,
  duration: t.duration ?? undefined,
  metaData: { title: t.title, artist: "" },
})

const readPlaylist = (webamp: Webamp): Track[] =>
  webamp.getPlaylistTracks().map((t) => ({
    id: t.id,
    title: t.title ?? t.defaultName ?? "Untitled",
    url: t.url,
    duration: t.duration,
  }))

const same = (a: Track[], b: Track[]) =>
  a.length === b.length &&
  a.every((t, i) => t.id === b[i].id && t.title === b[i].title && t.duration === b[i].duration)

export function Editor() {
  const stage = useRef<HTMLDivElement>(null)
  const section = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const commands = useAudio((s) => s.commands)
  const [sessionReady, setSessionReady] = useState(false)
  const { width, height } = useFrame(frameSize)
  const { scale, mode, color, image, fit } = useCanvas()
  const templateId = useTemplate((s) => s.id)
  const preview = usePreview((s) => s.active)
  const frameSizePx = useElementSize(frame, supported)
  // zoom, not transform: zoom changes layout geometry too, so Webamp's slider drags stay accurate
  const zoom = frameSizePx.height
    ? Math.max(0.05, Math.min((frameSizePx.height * scale) / SKIN_H, frameSizePx.width / SKIN_W))
    : 1
  /** A seek that must wait for a newly selected track to load. */
  const pendingSeek = useRef<{ index: number; offset: number; pause: boolean; loaded: boolean } | null>(null)

  useShortcuts()

  // the editor owns Webamp, so it supplies the export runner the dialog calls
  useEffect(() => {
    useExport.getState().setRunner(runExport)
    // dev aid for checking the export renderer without decoding a video
    return () => useExport.getState().setRunner(null)
  }, [])

  // fullscreen goes on the whole editor, so the frame keeps sizing from container units
  // and the transport and timeline come with it
  useEffect(() => {
    const el = section.current
    if (!el) return
    if (preview && document.fullscreenElement !== el) void el.requestFullscreen().catch(() => {})
    if (!preview && document.fullscreenElement === el) void document.exitFullscreen().catch(() => {})
  }, [preview])

  // Esc and the browser's own exit bypass our button, so mirror the real state back
  useEffect(() => {
    const onChange = () => usePreview.getState().setActive(document.fullscreenElement === section.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // the sidebar picks a template; the editor owns Webamp, so it does the loading
  const loadedTemplate = useRef<string | null>(null)
  useEffect(() => {
    if (!supported || loadedTemplate.current === templateId) return
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const first = loadedTemplate.current === null
    loadedTemplate.current = templateId
    // the constructor loads the saved skin, so on the first pass only warm the picker
    void (first ? prefetchSkins() : loadSkin(template))
  }, [templateId])

  useEffect(() => {
    if (!supported || !stage.current) return
    const webamp = getWebamp()
    void renderOnce(stage.current).then(() => {
      // one cursor for the whole editor: borrow the skin's main-window cursor once the skin has loaded
      const main = document.querySelector("#webamp #main-window")
      const cursor = main ? getComputedStyle(main).cursor : ""
      if (section.current && cursor.startsWith("url")) section.current.style.cursor = cursor
      void restoreSession(webamp).then(() => {
        saveSession(webamp, getCurrentIndex())
        setSessionReady(true)
      })
    })
    const store = useAudio.getState()
    const unsubState = webamp.__onStateChange(() => {
      const next = readPlaylist(webamp)
      const state = useAudio.getState()
      const tracksChanged = !same(state.tracks, next)
      if (tracksChanged) store.setTracks(next)
      const status = webamp.getMediaStatus()
      if (status !== state.status) store.setStatus(status)
      const time = getElapsed()
      if (time !== state.time) store.setTime(time)
      const index = getCurrentIndex()
      if (tracksChanged || index !== state.current) {
        // append registers file IDs after dispatch; removal briefly empties the playlist.
        // Save the completed mutation, never one of those intermediate states.
        queueMicrotask(() => saveSession(webamp, getCurrentIndex()))
      }
      if (index !== state.current) {
        store.setCurrent(index)
        if (index !== null) revealTrack(index, next.length)
      }
      // a cross-track seek waits until the new track has loaded and produced its first time tick
      const pending = pendingSeek.current
      if (pending?.loaded && index === pending.index && status === "PLAYING" && time > 0 && time < 5) {
        pendingSeek.current = null
        webamp.seekToTime(pending.offset)
        if (pending.pause) webamp.pause()
      }
    })
    const unsubTrack = webamp.onTrackDidChange((info) => {
      if (info && pendingSeek.current) pendingSeek.current.loaded = true
    })
    return () => {
      unsubState()
      unsubTrack()
    }
  }, [])

  useEffect(() => {
    if (!supported || !sessionReady || commands.length === 0) return
    const webamp = getWebamp()
    for (const c of commands) {
      const tracks = readPlaylist(webamp)
      const current = useAudio.getState().current
      const step = (dir: 1 | -1) => {
        if (tracks.length === 0) return
        const from = current ?? (dir === 1 ? -1 : tracks.length)
        const to = (from + dir + tracks.length) % tracks.length
        webamp.setCurrentTrack(tracks[to].id)
      }
      if (c.type === "add") {
        // Wait until restore/pruning finishes before saving newly uploaded files.
        c.files.forEach((file, i) => void putFile(c.ids[i], file))
        // append only: adding never starts playback
        webamp.appendTracks(c.files.map(toBlobTrack))
        trackAppended(webamp, c.ids)
      } else if (c.type === "remove") {
        // rebuild without setTracksToPlay so nothing auto-plays; resume the same track if it was playing
        const wasPlaying = webamp.getMediaStatus() === "PLAYING" && current !== null && current !== c.index
        const keepUrl = wasPlaying ? tracks[current].url : null
        webamp.stop()
        clearPlaylist()
        const rest = tracks.filter((_, i) => i !== c.index)
        if (rest.length) webamp.appendTracks(rest.map(toUrlTrack))
        if (keepUrl) {
          const again = webamp.getPlaylistTracks().find((t) => t.url === keepUrl)
          if (again) {
            webamp.setCurrentTrack(again.id)
            webamp.play()
          }
        }
      } else if (c.type === "toggle") {
        // while stopped, setCurrentTrack only selects; play() is what starts it
        if (webamp.getMediaStatus() === "PLAYING") webamp.pause()
        else if (tracks.length) {
          if (current === null) webamp.setCurrentTrack(tracks[0].id)
          webamp.play()
        }
      } else if (c.type === "seek") {
        // global timeline time -> track index + offset
        let index = 0
        let offset = Math.max(0, c.time)
        while (index < tracks.length - 1 && offset >= (tracks[index].duration ?? 0)) {
          offset -= tracks[index].duration ?? 0
          index++
        }
        const target = tracks[index]
        if (!target) continue
        const status = webamp.getMediaStatus()
        if (index !== current) {
          // the new track has to load before it can seek; onTrackDidChange finishes the job
          pendingSeek.current = { index, offset, pause: status === "PAUSED", loaded: false }
          webamp.setCurrentTrack(target.id)
          webamp.play()
        } else {
          if (status === "STOPPED") webamp.play()
          webamp.seekToTime(offset)
        }
      } else if (c.type === "next") {
        step(1)
      } else if (c.type === "previous") {
        step(-1)
      } else if (c.type === "rename") {
        const target = tracks[c.index]
        if (target) renameTrack(target.id, c.title)
      } else {
        // despite its docs, setCurrentTrack wants the track id, not the index
        const target = tracks[c.index]
        if (target) webamp.setCurrentTrack(target.id)
      }
    }
    useAudio.getState().clearCommands()
  }, [commands, sessionReady])

  if (!supported) {
    return (
      <section className="grid place-items-center bg-graphite p-8">
        <p className="text-[15px] leading-normal text-ash">
          This browser can't run the player. Try Chrome, Edge or Firefox.
        </p>
      </section>
    )
  }

  return (
    <section
      ref={section}
      className={cn(
        "grid overflow-hidden",
        // preview is the video and nothing else: black letterbox, no chrome, no padding
        preview ? "grid-rows-1 bg-letterbox p-0" : "grid-rows-[1fr_auto_auto] bg-graphite p-8",
      )}
      onContextMenuCapture={(e) => {
        // the editor has no context menu; this also stops Webamp opening its own
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* container units size the frame to the largest box of the ratio that fits */}
      <div className="grid min-h-0 w-full place-items-center @container-size">
        <div
          ref={frame}
          className={cn("relative", mode === "transparent" && "checkerboard")}
          style={{
            width: `min(100cqw, ${width / height} * 100cqh)`,
            aspectRatio: `${width} / ${height}`,
            ...(mode === "transparent"
              ? {}
              : mode === "image" && image
                ? {
                    backgroundImage: `url(${image})`,
                    backgroundSize: fit,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
                : { background: color }),
          }}
        >
          {/* preview is a look at the video, not a player: nothing in the skin responds */}
          <div
            className={cn(
              "absolute inset-0 grid place-items-center overflow-hidden",
              preview && "pointer-events-none",
            )}
          >
            <div ref={stage} className="relative h-87 w-68.75" style={{ zoom }} />
          </div>
        </div>
      </div>
      {!preview && (
        <>
          <Transport />
          <Timeline />
        </>
      )}
    </section>
  )
}
