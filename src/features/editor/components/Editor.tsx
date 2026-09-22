import { useEffect, useRef, useState } from "react"
import { IconMinimize } from "@tabler/icons-react"
import { IconButton } from "../../../shared/ui"
import Webamp from "webamp"
import { effectiveDuration, useAudio, type Track } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { useElementSize } from "../../../shared/lib/useElementSize"
import { useTemplate } from "../../../shared/store/useTemplate"
import { usePreview } from "../../../shared/store/usePreview"
import { findTemplate, useSavedSkins } from "../../../shared/store/useSavedSkins"
import { cn } from "../../../shared/lib/cn"
import { stripExt } from "../../../shared/lib/stripExt"
import { putFile } from "../../../shared/lib/sessionFiles"
import { bufferTrack, clearPlaylist, getCurrentIndex, getElapsed, getStage, getWebamp, loadSkin, prefetchSkins, renameTrack, renderOnce, revealTrack } from "../lib/webamp"
import { useShortcuts } from "../lib/useShortcuts"
import { useMediaSession } from "../lib/useMediaSession"
import { restoreSession, saveSession, trackAppended } from "../lib/restoreSession"
import { useExport } from "../../../shared/store/useExport"
import { useReset } from "../../../shared/store/useReset"
import { resetApp } from "../../../shared/lib/resetApp"
import { useToast } from "../../../shared/store/useToast"
import { Timeline } from "./Timeline"
import { Transport } from "./Transport"

const supported = Webamp.browserIsSupported()

/** iOS Safari exposes fullscreen on <video> only, so arbitrary elements have no request method. */
const nativeFullscreen =
  typeof Element !== "undefined" && !!Element.prototype.requestFullscreen && document.fullscreenEnabled

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

const readPlaylist = (webamp: Webamp): Track[] => {
  const trims = useAudio.getState().trims
  return webamp.getPlaylistTracks().map((t) => ({
    id: t.id,
    title: t.title ?? t.defaultName ?? "Untitled",
    url: t.url,
    duration: t.duration,
    trim: trims[t.url] ?? null,
  }))
}

/**
 * Replaces the playlist with `next`, without setTracksToPlay so nothing auto-plays.
 * If the track at `keep` was playing it resumes, wherever it landed in the new order.
 */
const rebuild = (webamp: Webamp, next: Track[], keep: number | null) => {
  const tracks = readPlaylist(webamp)
  const playing = webamp.getMediaStatus() === "PLAYING" && keep !== null
  const keepUrl = playing ? (tracks[keep]?.url ?? null) : null
  webamp.stop()
  clearPlaylist()
  if (next.length) webamp.appendTracks(next.map(toUrlTrack))
  if (!keepUrl) return
  const again = webamp.getPlaylistTracks().find((t) => t.url === keepUrl)
  if (again) {
    webamp.setCurrentTrack(again.id)
    webamp.play()
  }
}

/** A cut this close to the start would leave nothing, so it is ignored. */
const MIN_TRIM = 0.1

/** Global timeline time -> which track it lands in, and how far into that track. */
const locate = (tracks: Track[], at: number) => {
  let index = 0
  let offset = Math.max(0, at)
  while (index < tracks.length - 1 && offset >= effectiveDuration(tracks[index])) {
    offset -= effectiveDuration(tracks[index])
    index++
  }
  return { index, offset }
}

const same = (a: Track[], b: Track[]) =>
  a.length === b.length &&
  a.every(
    (t, i) => t.id === b[i].id && t.title === b[i].title && t.duration === b[i].duration && t.trim === b[i].trim,
  )

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
  useMediaSession()

  // likewise the reset: emptying the playlist needs the Webamp the editor owns
  useEffect(() => {
    useReset.getState().setRunner(async () => {
      await resetApp(() => {
        if (!supported) return
        getWebamp().stop()
        clearPlaylist()
      })
    })
    return () => useReset.getState().setRunner(null)
  }, [])

  // the editor owns Webamp, so it supplies the export runner the dialog calls
  useEffect(() => {
    useExport.getState().setRunner(async (request) => {
      const state = useExport.getState()
      if (state.running) return
      state.setRunning(true)
      try {
        const { runExport } = await import("../lib/runExport")
        await runExport(request)
      } catch {
        useToast.getState().show("Export couldn't load. Check your connection and try again.")
      } finally {
        state.setRunning(false)
      }
    })
    return () => useExport.getState().setRunner(null)
  }, [])

  // fullscreen goes on the whole editor, so the frame keeps sizing from container units
  // and the transport and timeline come with it.
  // ponytail: iOS Safari has no Element.requestFullscreen (only <video> gets webkit's), so
  // calling it throws synchronously past .catch and crashes the boundary. Feature-detect and
  // let the fixed-overlay classes below stand in; drop this when iOS ships the real API.
  useEffect(() => {
    const el = section.current
    if (!el || !nativeFullscreen) return
    if (preview && document.fullscreenElement !== el) void el.requestFullscreen().catch(() => {})
    if (!preview && document.fullscreenElement === el) void document.exitFullscreen?.().catch(() => {})
  }, [preview])

  // Esc and the browser's own exit bypass our button, so mirror the real state back
  useEffect(() => {
    const onChange = () => usePreview.getState().setActive(document.fullscreenElement === section.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // the sidebar picks a template; the editor owns Webamp, so it does the loading
  const loadedTemplate = useRef<string | null>(null)
  // a saved skin's blob URL is rebuilt asynchronously on boot, so re-run once it lands
  const savedUrl = useSavedSkins((s) => s.urls[templateId])
  useEffect(() => {
    if (!supported || loadedTemplate.current === templateId) return
    const template = findTemplate(templateId)
    if (!template) return
    const first = loadedTemplate.current === null
    loadedTemplate.current = templateId
    // the constructor already loaded a bundled skin, so a first pass only warms the picker.
    // A saved skin resolves after hydration, later than the constructor, so it still loads.
    if (!first || template.url) void loadSkin(template)
    if (first) void prefetchSkins()
  }, [templateId, savedUrl])

  // the stage node survives unmount, so each mounted editor re-parents it into its own layout
  useEffect(() => {
    if (!supported || !stage.current) return
    stage.current.appendChild(getStage())
  }, [])

  // React does not own the stage node, so zoom is applied directly
  useEffect(() => {
    if (supported) getStage().style.zoom = String(zoom)
  }, [zoom])

  useEffect(() => {
    if (!supported || !stage.current) return
    const webamp = getWebamp()
    void renderOnce().then(() => {
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
      // Webamp plays the whole file, so a cut is enforced here: this already ticks through
      // playback, which saves running a timer of our own alongside it.
      if (index !== null && status === "PLAYING") {
        const trim = next[index]?.trim
        if (trim != null && time >= trim) {
          if (index < next.length - 1) webamp.nextTrack()
          else webamp.stop()
        }
      }
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
        rebuild(webamp, tracks.filter((_, i) => i !== c.index), current === c.index ? null : current)
      } else if (c.type === "move") {
        const { from, to } = c
        if (from === to || !tracks[from] || to < 0 || to >= tracks.length) continue
        const next = [...tracks]
        next.splice(to, 0, ...next.splice(from, 1))
        rebuild(webamp, next, current)
      } else if (c.type === "toggle") {
        // while stopped, setCurrentTrack only selects; play() is what starts it
        if (webamp.getMediaStatus() === "PLAYING") webamp.pause()
        else if (tracks.length) {
          if (current === null) webamp.setCurrentTrack(tracks[0].id)
          webamp.play()
        }
      } else if (c.type === "cut") {
        const { index, offset } = locate(tracks, c.at)
        const target = tracks[index]
        if (!target) continue
        const end = effectiveDuration(target)
        // nothing to keep, or nothing to remove
        if (offset < MIN_TRIM || offset >= end) continue
        useAudio.getState().setTrim(target.url, offset)
        // never leave the playhead inside audio that no longer exists
        if (index === current && getElapsed() > offset) webamp.seekToTime(Math.max(0, offset - 0.05))
        queueMicrotask(() => saveSession(webamp, getCurrentIndex()))
      } else if (c.type === "seek") {
        const { index, offset } = locate(tracks, c.time)
        const target = tracks[index]
        if (!target) continue
        // scrubbing moves the playhead, it does not start the track: whatever was or was not
        // playing before the seek is what is playing after it
        const wasPlaying = webamp.getMediaStatus() === "PLAYING"
        if (index !== current && !wasPlaying) {
          // BUFFER_TRACK selects the track without autoplaying it, so a paused scrub stays
          // paused: no playback to undo afterwards, and the seek lands straight away because
          // the duration comes from the track metadata rather than the loaded media.
          bufferTrack(target.id)
          webamp.seekToTime(offset)
        } else if (index !== current) {
          // playing, so the track is meant to keep going: load it the normal way and let
          // pendingSeek place the playhead once onTrackDidChange says it is ready
          pendingSeek.current = { index, offset, pause: false, loaded: false }
          webamp.setCurrentTrack(target.id)
          webamp.play()
        } else {
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
      <section className="grid place-items-center bg-graphite p-4 md:p-8">
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
        // stacked on mobile the editor has no row track to fill, so it carries its own height
        !preview && "min-h-[60svh] md:min-h-0",
        // preview is the video and nothing else: black letterbox, no chrome, no padding.
        // The fixed inset covers the screen where native fullscreen is unavailable (iOS) and
        // is harmless where it is: the fullscreen element already fills the viewport.
        preview
          ? "fixed inset-0 z-50 grid-rows-1 bg-letterbox p-0"
          : "relative grid-rows-[1fr_auto_auto] bg-graphite p-4 md:p-8",
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
            {/* the persistent webamp node is re-parented into here on mount */}
            <div ref={stage} />
          </div>
        </div>
      </div>
      {!preview && (
        <>
          <Transport />
          <Timeline />
        </>
      )}
      {/* without native fullscreen there is no Esc and no browser chrome to escape with,
          so the fallback overlay carries its own way out */}
      {preview && !nativeFullscreen && (
        <IconButton
          aria-label="Exit fullscreen"
          onClick={() => usePreview.getState().toggle()}
          className="absolute top-4 right-4 bg-ink/70 text-paper"
        >
          <IconMinimize size={16} stroke={1.5} aria-hidden />
        </IconButton>
      )}
    </section>
  )
}
