import { useEffect } from "react"
import { useAudio } from "../../../shared/store/useAudio"

/** How far the media centre's skip buttons jump when they do not name an offset. */
const SKIP = 10

/** Artwork for the OS overlay; the one image the app ships. */
const ARTWORK = [{ src: "/images/logo.png", sizes: "2000x2000", type: "image/png" }]

const supported = typeof navigator !== "undefined" && "mediaSession" in navigator

/** Browsers support different subsets, and an unsupported action throws. */
const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch {
    // the control simply will not appear; everything else still works
  }
}

/**
 * Puts the playing track in the browser's media control centre — the notification by the address
 * bar, the OS overlay and lock screen, and whatever the hardware media keys drive. Without this
 * browsers fall back to the page title, so every track reads as the app's name.
 *
 * The title is the one from the tracks list, so a rename shows up here too.
 */
export const useMediaSession = () => {
  const { tracks, current, status, time } = useAudio()
  const track = current === null ? null : (tracks[current] ?? null)
  const many = tracks.length > 1

  // the card itself: cleared when nothing is loaded, so it does not outlive the playlist
  useEffect(() => {
    if (!supported) return
    navigator.mediaSession.metadata = track ? new MediaMetadata({ title: track.title, artwork: ARTWORK }) : null
  }, [track])

  useEffect(() => {
    if (!supported) return
    navigator.mediaSession.playbackState =
      status === "PLAYING" ? "playing" : status === "PAUSED" ? "paused" : "none"
  }, [status])

  // the scrubber reads the current track, not the whole timeline, so it reports track-local values
  useEffect(() => {
    if (!supported || !navigator.mediaSession.setPositionState) return
    const duration = track?.duration ?? 0
    if (!duration) return
    try {
      navigator.mediaSession.setPositionState({ duration, position: Math.min(time, duration) })
    } catch {
      // a position past the duration on the tick where the track changed; the next tick corrects it
    }
  }, [track, time])

  useEffect(() => {
    if (!supported) return
    const enqueue = useAudio.getState().enqueue

    /**
     * The seek command speaks global timeline time, but the media centre reports a position
     * within the current track — so the track's start has to be added back on, or a seek on
     * track 2 lands in track 1.
     */
    const toGlobal = (within: number) => {
      const state = useAudio.getState()
      const index = state.current ?? 0
      const start = state.tracks.slice(0, index).reduce((a, t) => a + (t.duration ?? 0), 0)
      const duration = state.tracks[index]?.duration ?? 0
      return start + Math.max(0, Math.min(within, duration))
    }

    setHandler("play", () => enqueue({ type: "toggle" }))
    setHandler("pause", () => enqueue({ type: "toggle" }))
    // null rather than unset, so the browser greys them out instead of hiding the row
    setHandler("previoustrack", many ? () => enqueue({ type: "previous" }) : null)
    setHandler("nexttrack", many ? () => enqueue({ type: "next" }) : null)
    setHandler("seekto", (details) => {
      if (details.seekTime != null) enqueue({ type: "seek", time: toGlobal(details.seekTime) })
    })
    setHandler("seekforward", (details) =>
      enqueue({ type: "seek", time: toGlobal(useAudio.getState().time + (details.seekOffset ?? SKIP)) }),
    )
    setHandler("seekbackward", (details) =>
      enqueue({ type: "seek", time: toGlobal(useAudio.getState().time - (details.seekOffset ?? SKIP)) }),
    )

    return () => {
      for (const action of ["play", "pause", "previoustrack", "nexttrack", "seekto", "seekforward", "seekbackward"] as const) {
        setHandler(action, null)
      }
    }
  }, [many])
}
