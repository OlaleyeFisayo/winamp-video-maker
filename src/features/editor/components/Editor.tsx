import { useEffect, useRef } from "react"
import Webamp from "webamp"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { stripExt } from "../../../shared/lib/stripExt"
import { getWebamp, renameTrack, renderOnce, revealTrack } from "../lib/webamp"

const supported = Webamp.browserIsSupported()

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
  const commands = useAudio((s) => s.commands)
  const { width, height } = useFrame(frameSize)

  useEffect(() => {
    if (!supported || !stage.current) return
    const webamp = getWebamp()
    void renderOnce(stage.current)
    const store = useAudio.getState()
    const unsubState = webamp.__onStateChange(() => {
      const next = readPlaylist(webamp)
      if (!same(useAudio.getState().tracks, next)) store.setTracks(next)
    })
    const unsubTrack = webamp.onTrackDidChange((info) => {
      const playlist = webamp.getPlaylistTracks()
      const i = info ? playlist.findIndex((t) => t.url === info.url) : -1
      store.setCurrent(i < 0 ? null : i)
      if (i >= 0) revealTrack(i, playlist.length)
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
      if (c.type === "add") {
        if (tracks.length === 0) webamp.setTracksToPlay(c.files.map(toBlobTrack))
        else webamp.appendTracks(c.files.map(toBlobTrack))
      } else if (c.type === "remove") {
        const rest = tracks.filter((_, i) => i !== c.index)
        if (rest.length === 0) webamp.stop()
        webamp.setTracksToPlay(rest.map(toUrlTrack))
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
    <section className="overflow-hidden bg-graphite p-8">
      {/* container units size the frame to the largest box of the ratio that fits */}
      <div className="grid h-full w-full place-items-center @container-size">
        <div
          className="relative bg-stage"
          style={{ width: `min(100cqw, ${width / height} * 100cqh)`, aspectRatio: `${width} / ${height}` }}
        >
          <div className="absolute inset-0 grid place-items-center overflow-hidden">
            {/* ponytail: skin is 1x and clips in a small frame; scaling to the frame comes with export */}
            <div ref={stage} className="relative h-87 w-68.75" />
          </div>
        </div>
      </div>
    </section>
  )
}
