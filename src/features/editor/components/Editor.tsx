import { useEffect, useRef } from "react"
import Webamp from "webamp"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { useElementSize } from "../../../shared/lib/useElementSize"
import { cn } from "../../../shared/lib/cn"
import { stripExt } from "../../../shared/lib/stripExt"
import { clearPlaylist, getCurrentIndex, getElapsed, getWebamp, renameTrack, renderOnce, revealTrack } from "../lib/webamp"
import { useShortcuts } from "../lib/useShortcuts"
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
  const { width, height } = useFrame(frameSize)
  const { scale, mode, color, image, fit } = useCanvas()
  const frameSizePx = useElementSize(frame, supported)
  // zoom, not transform: zoom changes layout geometry too, so Webamp's slider drags stay accurate
  const zoom = frameSizePx.height
    ? Math.max(0.05, Math.min((frameSizePx.height * scale) / SKIN_H, frameSizePx.width / SKIN_W))
    : 1
  /** A seek that must wait for a newly selected track to load. */
  const pendingSeek = useRef<{ index: number; offset: number; pause: boolean; loaded: boolean } | null>(null)

  useShortcuts()

  useEffect(() => {
    if (!supported || !stage.current) return
    const webamp = getWebamp()
    void renderOnce(stage.current).then(() => {
      // one cursor for the whole editor: borrow the skin's main-window cursor once the skin has loaded
      const main = document.querySelector("#webamp #main-window")
      const cursor = main ? getComputedStyle(main).cursor : ""
      if (section.current && cursor.startsWith("url")) section.current.style.cursor = cursor
    })
    const store = useAudio.getState()
    const unsubState = webamp.__onStateChange(() => {
      const next = readPlaylist(webamp)
      const state = useAudio.getState()
      if (!same(state.tracks, next)) store.setTracks(next)
      const status = webamp.getMediaStatus()
      if (status !== state.status) store.setStatus(status)
      const time = getElapsed()
      if (time !== state.time) store.setTime(time)
      const index = getCurrentIndex()
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
    if (!supported || commands.length === 0) return
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
        // append only: adding never starts playback
        webamp.appendTracks(c.files.map(toBlobTrack))
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
  }, [commands])

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
      className="grid grid-rows-[1fr_auto_auto] overflow-hidden bg-graphite p-8"
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
          <div className="absolute inset-0 grid place-items-center overflow-hidden">
            <div ref={stage} className="relative h-87 w-68.75" style={{ zoom }} />
          </div>
        </div>
      </div>
      <Transport />
      <Timeline />
    </section>
  )
}
