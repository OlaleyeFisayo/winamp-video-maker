import { memo, useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { IconArrowsHorizontal, IconMinus, IconPlus, IconScissors } from "@tabler/icons-react"
import { Button, IconButton } from "../../../shared/ui"
import { effectiveDuration, playheadTime, useAudio, type Track } from "../../../shared/store/useAudio"
import { useTheme } from "../../../shared/store/useTheme"
import { useWaveforms } from "../../../shared/store/useWaveforms"
import { ZOOM_MAX, ZOOM_MIN, useTimelineZoom } from "../../../shared/store/useTimelineZoom"
import { formatTime } from "../../../shared/lib/formatTime"
import { useElementSize } from "../../../shared/lib/useElementSize"
import { cn } from "../../../shared/lib/cn"

const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
const MIN_LABEL_GAP = 64
const KEY_STEP = 5
/** Width assumed before the first measurement, so a long playlist never renders thousands of ticks. */
const FALLBACK_WIDTH = 600

/** Smallest step whose labels sit at least MIN_LABEL_GAP px apart. */
const pickStep = (total: number, width: number) =>
  STEPS.find((s) => (s / total) * width >= MIN_LABEL_GAP) ?? STEPS[STEPS.length - 1]

const label = (t: number) => (t < 60 ? `${t}s` : formatTime(t))

/** The contrast token flips between black and white; read once per theme, not per canvas. */
const contrastFor = (() => {
  const cache = new Map<string, string>()
  return (theme: string) => {
    let c = cache.get(theme)
    if (!c) {
      c = getComputedStyle(document.documentElement).getPropertyValue("--contrast").trim() || "#FFFFFF"
      cache.set(theme, c)
    }
    return c
  }
})()

type WaveProps = { url: string; active: boolean; fraction: number }

/**
 * The track's peaks, mirrored about the centre line and drawn behind its label. Canvas rather
 * than one element per bucket: 400 buckets a track adds up, and this redraws cheaply. The
 * active/idle strength is CSS opacity, so a track change repaints nothing.
 */
function Waveform({ url, active, fraction }: WaveProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const peaks = useWaveforms((s) => s.peaks[url])
  const { width, height } = useElementSize(canvas, true)
  const theme = useTheme((s) => s.theme)

  useEffect(() => {
    const el = canvas.current
    if (!el || !peaks || width < 1 || height < 1) return
    // drawn once a zoom or resize settles: meanwhile CSS stretches the last bitmap, which is
    // far cheaper than reallocating and redrawing a canvas thousands of pixels wide every frame
    const id = setTimeout(() => {
      const ctx = el.getContext("2d")
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(width * dpr)
      const h = Math.round(height * dpr)
      // assigning width/height reallocates the bitmap even when unchanged, so only do it on change
      if (el.width !== w || el.height !== h) {
        el.width = w
        el.height = h
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = contrastFor(theme)

      // one bar per pixel column, so a narrow block samples the peaks rather than cramming them
      const mid = height / 2
      const columns = Math.max(1, Math.floor(width))
      // a cut keeps the head of the file, so only that slice of the peaks belongs in the block
      const span = Math.max(1, Math.floor(peaks.length * fraction))
      const path = new Path2D()
      for (let x = 0; x < columns; x++) {
        const peak = peaks[Math.min(span - 1, Math.floor((x / columns) * span))]
        // a floor of half a pixel keeps silence as a centre line instead of a gap
        const half = Math.max(0.5, peak * mid)
        path.rect(x, mid - half, 1, half * 2)
      }
      ctx.fill(path)
    }, 120)
    return () => clearTimeout(id)
  }, [peaks, width, height, theme, fraction])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full", active ? "opacity-[0.38]" : "opacity-[0.18]")}
    />
  )
}

type Layout = { durations: number[]; starts: number[]; total: number }

const layoutOf = (tracks: Track[]): Layout => {
  // a cut shortens the track everywhere, so the timeline measures the trimmed length
  const durations = tracks.map(effectiveDuration)
  const starts: number[] = []
  let total = 0
  for (const d of durations) {
    starts.push(total)
    total += d
  }
  return { durations, starts, total }
}

/**
 * The only part of the timeline that moves with playback. It subscribes to the playhead alone,
 * so the ticks, blocks and waveforms above it never render on a time tick.
 */
function Playhead({ total }: { total: number }) {
  const head = useAudio(playheadTime)
  if (head === null || total <= 0) return null
  return (
    // the bar takes the pointer itself, so the marker never intercepts a drag
    <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${(head / total) * 100}%` }}>
      <div className="absolute inset-y-0 w-px bg-contrast" />
      {/* the grip: the timeline has always been draggable, nothing said so */}
      <div className="absolute -top-1.5 size-3 -translate-x-1/2 rounded-full bg-contrast" />
    </div>
  )
}

const pct = (t: number, total: number) => (total > 0 ? `${(t / total) * 100}%` : "0%")

/*
 * The ruler and the blocks are placed in percentages, so a zoom only widens their parent.
 * Memoised so a zoom frame never re-renders them: past a few hundred ticks that render was
 * what made a pinch lag behind the fingers.
 */
const Ruler = memo(function Ruler({ ticks, step, total }: { ticks: number[]; step: number; total: number }) {
  return (
    <div className="relative h-6 bg-ink">
      {ticks.map((t) => {
        const major = Math.abs((t / step) % 1) < 1e-6
        return (
          <div key={t} className="absolute top-0 h-full" style={{ left: pct(t, total) }}>
            <div className={cn("w-px bg-rule", major ? "h-2" : "h-1")} />
            {major && (
              <span className="absolute left-1 top-1.5 font-mono text-[11px] leading-none text-ash">{label(t)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
})

type BlocksProps = { tracks: Track[]; current: number | null; starts: number[]; durations: number[]; total: number }

const Blocks = memo(function Blocks({ tracks, current, starts, durations, total }: BlocksProps) {
  return (
    <div className="relative h-9 bg-graphite">
      {tracks.map((t, i) => (
        <div
          key={t.id}
          data-active={i === current || undefined}
          style={{ left: pct(starts[i], total), width: durations[i] ? pct(durations[i], total) : 4 }}
          className={cn(
            "absolute top-0 flex h-full min-w-1 items-center gap-2 overflow-hidden border-r border-rule px-2",
            i === current && "outline-1 -outline-offset-1 outline-contrast",
          )}
        >
          {/* the canvas sizes from its block, so zooming in draws more detail */}
          <Waveform url={t.url} active={i === current} fraction={t.trim && t.duration ? t.trim / t.duration : 1} />
          <span className="relative min-w-0 flex-1 truncate text-[13px] leading-none text-paper">{t.title}</span>
          {t.trim != null && (
            <IconScissors size={12} stroke={1.5} aria-label="Cut" className="relative shrink-0 text-ash" />
          )}
          <span className="relative shrink-0 font-mono text-[11px] leading-none text-ash">
            {formatTime(durations[i])}
          </span>
        </div>
      ))}
    </div>
  )
})

export function Timeline() {
  const tracks = useAudio((s) => s.tracks)
  const current = useAudio((s) => s.current)
  const enqueue = useAudio((s) => s.enqueue)
  const viewport = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(inner, tracks.length > 0)
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
    const strip = inner.current
    if (!box || !strip) return

    /**
     * A gesture fires far faster than the timeline can render, so events only record where
     * the zoom should go and one frame applies the latest. The width is written straight to
     * the DOM before scrolling: waiting on React's render would read a stale scrollWidth and
     * clamp the scroll, so the view would drift off the point being zoomed.
     */
    let target: number | null = null
    let anchorX = 0
    let frame = 0
    const zoomNow = () => target ?? useTimelineZoom.getState().zoom
    const apply = () => {
      frame = 0
      if (target === null) return
      const x = anchorX - box.getBoundingClientRect().left
      const anchored = (box.scrollLeft + x) / box.scrollWidth
      strip.style.width = `${target * 100}%`
      box.scrollLeft = anchored * box.scrollWidth - x
      useTimelineZoom.getState().setZoom(target)
      target = null
    }
    /** Zooms to `next`, keeping the time under `clientX` still so it does not wander. */
    const zoomTo = (clientX: number, next: number) => {
      target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
      anchorX = clientX
      frame ||= requestAnimationFrame(apply)
    }

    const onWheel = (e: globalThis.WheelEvent) => {
      // plain scroll belongs to the page; only the zoom gesture is claimed
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      // scaled by the delta: a trackpad pinch sends many small ones, a mouse notch one big one
      // capped so one mouse notch matches the zoom buttons' step
      const dy = Math.min(25, Math.max(-25, e.deltaY))
      zoomTo(e.clientX, zoomNow() * Math.exp(-dy * 0.01))
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
      cancelAnimationFrame(frame)
      box.removeEventListener("wheel", onWheel)
      box.removeEventListener("touchstart", onTouchStart)
      box.removeEventListener("touchmove", onTouchMove)
      box.removeEventListener("touchend", onTouchEnd)
      box.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [mounted])

  const { durations, starts, total } = useMemo(() => layoutOf(tracks), [tracks])

  // the parts of the timeline that move with playback, done by hand off a store subscription so
  // no component renders per tick: the slider's spoken value, and following the playhead once
  // it leaves the visible slice (never fighting a drag)
  useEffect(() => {
    const follow = (head: number | null) => {
      const el = slider.current
      if (el) {
        el.setAttribute("aria-valuenow", String(Math.round(head ?? 0)))
        el.setAttribute("aria-valuetext", head === null ? "Not playing" : formatTime(head))
      }
      const box = viewport.current
      if (!box || head === null || total <= 0 || box.dataset.dragging || useTimelineZoom.getState().zoom === 1) return
      const x = (head / total) * box.scrollWidth
      if (x < box.scrollLeft || x > box.scrollLeft + box.clientWidth) {
        box.scrollLeft = Math.max(0, x - box.clientWidth / 2)
      }
    }
    follow(playheadTime(useAudio.getState()))
    return useAudio.subscribe((s, p) => {
      if (s.time !== p.time || s.current !== p.current || s.tracks !== p.tracks) follow(playheadTime(s))
    })
  }, [total])
  const step = total > 0 ? pickStep(total, width || FALLBACK_WIDTH) : 1
  const ticks = useMemo(() => {
    const out: number[] = []
    for (let t = step / 2; t < total; t += step / 2) out.push(t)
    return out
  }, [step, total])

  if (tracks.length === 0) return null

  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    enqueue({ type: "seek", time: frac * total })
  }
  // the drag flag lives on the viewport node so the playhead's scroll-follow can read it
  const setDragging = (on: boolean) => {
    const box = viewport.current
    if (!box) return
    if (on) box.dataset.dragging = "true"
    else delete box.dataset.dragging
  }
  // pointers only ever scrub: the pinch lives on the touch events, which preventDefault
  // suppresses these for anyway
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (total === 0) return
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!viewport.current?.dataset.dragging) return
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
  const onPointerUp = () => setDragging(false)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const head = playheadTime(useAudio.getState())
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
            ref={slider}
            role="slider"
            aria-label="Timeline"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative cursor-pointer touch-none select-none overflow-hidden rounded-sm border border-rule focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
          >
            <Ruler ticks={ticks} step={step} total={total} />
            <Blocks tracks={tracks} current={current} starts={starts} durations={durations} total={total} />
          </div>
          <Playhead total={total} />
        </div>
      </div>
      <Tools />
    </div>
  )
}

/** Zoom controls, and the cut that the X shortcut also runs. */
function Tools() {
  const zoom = useTimelineZoom((s) => s.zoom)
  const zoomIn = useTimelineZoom((s) => s.in)
  const zoomOut = useTimelineZoom((s) => s.out)
  const fit = useTimelineZoom((s) => s.fit)
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
