import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { IconArrowsHorizontal, IconMinus, IconPlus, IconScissors } from "@tabler/icons-react"
import { Button, IconButton } from "../../../shared/ui"
import { effectiveDuration, playheadFraction, playheadTime, useAudio } from "../../../shared/store/useAudio"
import { useTheme } from "../../../shared/store/useTheme"
import { useWaveforms } from "../../../shared/store/useWaveforms"
import { ZOOM_MAX, ZOOM_MIN, useTimelineZoom } from "../../../shared/store/useTimelineZoom"
import { formatTime } from "../../../shared/lib/formatTime"
import { useElementSize } from "../../../shared/lib/useElementSize"
import { cn } from "../../../shared/lib/cn"

const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
const MIN_LABEL_GAP = 64
const KEY_STEP = 5

/** Smallest step whose labels sit at least MIN_LABEL_GAP px apart. */
const pickStep = (total: number, width: number) =>
  STEPS.find((s) => (s / total) * width >= MIN_LABEL_GAP) ?? STEPS[STEPS.length - 1]

const label = (t: number) => (t < 60 ? `${t}s` : formatTime(t))

/** How loud the waveform reads against the block; the active track's is stronger. */
const WAVE_ALPHA = { active: 0.38, idle: 0.18 }

type WaveProps = { url: string; active: boolean }

/**
 * The track's peaks, mirrored about the centre line and drawn behind its label. Canvas rather
 * than one element per bucket: 400 buckets a track adds up, and this redraws cheaply.
 */
function Waveform({ url, active }: WaveProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const peaks = useWaveforms((s) => s.peaks[url])
  const { width, height } = useElementSize(box, true)
  // the contrast token flips between black and white, so the colour is read at paint time
  const theme = useTheme((s) => s.theme)

  useEffect(() => {
    const el = canvas.current
    if (!el || !peaks || width < 1 || height < 1) return
    const ctx = el.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const colour = getComputedStyle(el).getPropertyValue("--contrast").trim() || "#FFFFFF"
    ctx.fillStyle = colour
    ctx.globalAlpha = active ? WAVE_ALPHA.active : WAVE_ALPHA.idle

    // one bar per pixel column, so a narrow block samples the peaks rather than cramming them
    const mid = height / 2
    const columns = Math.max(1, Math.floor(width))
    for (let x = 0; x < columns; x++) {
      const peak = peaks[Math.min(peaks.length - 1, Math.floor((x / columns) * peaks.length))]
      // a floor of half a pixel keeps silence as a centre line instead of a gap
      const half = Math.max(0.5, peak * mid)
      ctx.fillRect(x, mid - half, 1, half * 2)
    }
  }, [peaks, width, height, active, theme])

  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={canvas} className="size-full" />
    </div>
  )
}

export function Timeline() {
  const { tracks, current, time, enqueue } = useAudio()
  const viewport = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(inner, tracks.length > 0)
  const dragging = useRef(false)
  const zoom = useTimelineZoom((s) => s.zoom)
  // the viewport only exists once there are tracks, so the gestures bind when it appears
  const mounted = tracks.length > 0

  /**
   * Zoom gestures, bound by hand because React's onWheel and onTouchStart are passive: their
   * preventDefault is ignored, so the browser would pinch-zoom the whole page and ctrl+wheel
   * would zoom the page instead of the timeline.
   */
  useEffect(() => {
    const box = viewport.current
    if (!box) return

    /** Zooms to `next`, keeping the time under `clientX` still so it does not wander. */
    const zoomTo = (clientX: number, next: number) => {
      const left = box.getBoundingClientRect().left
      const anchored = (box.scrollLeft + (clientX - left)) / box.scrollWidth
      useTimelineZoom.getState().setZoom(next)
      requestAnimationFrame(() => {
        box.scrollLeft = anchored * box.scrollWidth - (clientX - left)
      })
    }

    const onWheel = (e: globalThis.WheelEvent) => {
      // plain scroll belongs to the page; only the zoom gesture is claimed
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomTo(e.clientX, useTimelineZoom.getState().zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
    }

    /**
     * The pinch runs on the touch events themselves, not on pointer events: preventing the
     * default here is what stops the browser zooming the page, and that same preventDefault
     * suppresses the pointer events the browser would otherwise synthesise from these touches.
     * One finger is left untouched, so scrubbing and scrolling are unaffected.
     */
    let pinch: { spread: number; zoom: number } | null = null
    const twoFinger = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return { spread: Math.abs(a.clientX - b.clientX) || 1, mid: (a.clientX + b.clientX) / 2 }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      e.preventDefault()
      pinch = { spread: twoFinger(e).spread, zoom: useTimelineZoom.getState().zoom }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || !pinch) return
      e.preventDefault()
      const { spread, mid } = twoFinger(e)
      // anchored on the midpoint of the fingers, so the time between them stays put
      zoomTo(mid, (pinch.zoom * spread) / pinch.spread)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null
    }

    box.addEventListener("wheel", onWheel, { passive: false })
    box.addEventListener("touchstart", onTouchStart, { passive: false })
    box.addEventListener("touchmove", onTouchMove, { passive: false })
    box.addEventListener("touchend", onTouchEnd)
    box.addEventListener("touchcancel", onTouchEnd)
    return () => {
      box.removeEventListener("wheel", onWheel)
      box.removeEventListener("touchstart", onTouchStart)
      box.removeEventListener("touchmove", onTouchMove)
      box.removeEventListener("touchend", onTouchEnd)
      box.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [mounted])

  // follow the playhead once it leaves the visible slice, but never fight a drag
  const headFrac = playheadFraction(useAudio())
  useEffect(() => {
    const box = viewport.current
    if (!box || dragging.current || zoom === 1) return
    const x = headFrac * box.scrollWidth
    if (x < box.scrollLeft || x > box.scrollLeft + box.clientWidth) {
      box.scrollLeft = Math.max(0, x - box.clientWidth / 2)
    }
  }, [headFrac, zoom])

  if (tracks.length === 0) return null

  // a cut shortens the track everywhere, so the timeline measures the trimmed length
  const durations = tracks.map(effectiveDuration)
  const total = durations.reduce((a, b) => a + b, 0)
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0))
  const pct = (t: number) => (total > 0 ? `${(t / total) * 100}%` : "0%")

  const step = total > 0 && width > 0 ? pickStep(total, width) : 1
  const ticks: number[] = []
  for (let t = step / 2; t < total; t += step / 2) ticks.push(t)

  const head = current === null ? null : starts[current] + Math.min(time, durations[current])

  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    enqueue({ type: "seek", time: frac * total })
  }
  // pointers only ever scrub: the pinch lives on the touch events, which preventDefault
  // suppresses these for anyway
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (total === 0) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    // a drag past the edge of the zoomed slice pulls the view along with the hand
    // ponytail: scrolls by the overshoot per move; a rAF loop if a held pointer needs to keep crawling
    const box = viewport.current
    if (box) {
      const r = box.getBoundingClientRect()
      if (e.clientX > r.right) box.scrollLeft += e.clientX - r.right
      else if (e.clientX < r.left) box.scrollLeft -= r.left - e.clientX
    }
    seekAt(e)
  }
  const onPointerUp = () => {
    dragging.current = false
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (head === null) return
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!dir) return
    e.preventDefault()
    enqueue({ type: "seek", time: Math.min(total, Math.max(0, head + dir * KEY_STEP)) })
  }

  return (
    <div className="mt-5">
      <div ref={viewport} className="relative touch-pan-x overflow-x-auto">
        {/* the bar clips its own contents; the playhead sits outside it so the thumb can ride
            the top edge without being cut off */}
        <div ref={inner} className="relative" style={{ width: `${zoom * 100}%` }}>
          <div
            role="slider"
            aria-label="Timeline"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(head ?? 0)}
            aria-valuetext={head === null ? "Not playing" : formatTime(head)}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative cursor-pointer touch-none select-none overflow-hidden rounded-sm border border-rule focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
          >
            <div className="relative h-6 bg-ink">
              {ticks.map((t) => {
                const major = Math.abs((t / step) % 1) < 1e-6
                return (
                  <div key={t} className="absolute top-0 h-full" style={{ left: pct(t) }}>
                    <div className={cn("w-px bg-rule", major ? "h-2" : "h-1")} />
                    {major && (
                      <span className="absolute left-1 top-1.5 font-mono text-[11px] leading-none text-ash">
                        {label(t)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="relative h-9 bg-graphite">
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  data-active={i === current || undefined}
                  style={{ left: pct(starts[i]), width: durations[i] ? pct(durations[i]) : 4 }}
                  className={cn(
                    "absolute top-0 flex h-full min-w-1 items-center gap-2 overflow-hidden border-r border-rule px-2",
                    i === current && "outline-1 -outline-offset-1 outline-contrast",
                  )}
                >
                  {/* the canvas sizes from its block, so zooming in draws more detail */}
                  <Waveform url={t.url} active={i === current} />
                  <span className="relative min-w-0 flex-1 truncate text-[13px] leading-none text-paper">
                    {t.title}
                  </span>
                  {t.trim != null && (
                    <IconScissors size={12} stroke={1.5} aria-label="Cut" className="relative shrink-0 text-ash" />
                  )}
                  <span className="relative shrink-0 font-mono text-[11px] leading-none text-ash">
                    {formatTime(durations[i])}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {head !== null && total > 0 && (
            // the bar takes the pointer itself, so the marker never intercepts a drag
            <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10" style={{ left: pct(head) }}>
              <div className="absolute inset-y-0 w-px bg-contrast" />
              {/* the grip: the timeline has always been draggable, nothing said so */}
              <div className="absolute -top-1.5 size-3 -translate-x-1/2 rounded-full bg-contrast" />
            </div>
          )}
        </div>
      </div>
      <Tools />
    </div>
  )
}

/** Zoom controls, and the cut that the X shortcut also runs. */
function Tools() {
  const { zoom, in: zoomIn, out: zoomOut, fit } = useTimelineZoom()
  const canCut = useAudio((s) => s.current !== null)

  return (
    <div className="mt-2 flex items-center justify-between">
      <Button
        aria-label="Cut at the playhead"
        title="Cut at the playhead (X)"
        disabled={!canCut}
        className="h-7 gap-1 px-2 text-[13px]"
        onClick={() => {
          const at = playheadTime(useAudio.getState())
          if (at !== null) useAudio.getState().enqueue({ type: "cut", at })
        }}
      >
        <IconScissors size={14} stroke={1.5} aria-hidden />
      </Button>
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Zoom out"
          title="Zoom out"
          className="size-7"
          disabled={zoom <= ZOOM_MIN}
          onClick={zoomOut}
        >
          <IconMinus size={14} stroke={1.5} aria-hidden />
        </IconButton>
        <IconButton
          aria-label="Fit timeline"
          title="Fit"
          className="size-7"
          disabled={zoom === ZOOM_MIN}
          onClick={fit}
        >
          <IconArrowsHorizontal size={14} stroke={1.5} aria-hidden />
        </IconButton>
        <IconButton
          aria-label="Zoom in"
          title="Zoom in"
          className="size-7"
          disabled={zoom >= ZOOM_MAX}
          onClick={zoomIn}
        >
          <IconPlus size={14} stroke={1.5} aria-hidden />
        </IconButton>
      </div>
    </div>
  )
}
