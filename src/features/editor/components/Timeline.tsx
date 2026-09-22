import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { IconScissors } from "@tabler/icons-react"
import { Button } from "../../../shared/ui"
import { effectiveDuration, playheadTime, useAudio } from "../../../shared/store/useAudio"
import { useTheme } from "../../../shared/store/useTheme"
import { useWaveforms } from "../../../shared/store/useWaveforms"
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
  const ref = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(ref, tracks.length > 0)
  const dragging = useRef(false)

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
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (total === 0) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) seekAt(e)
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
    <div className="mt-4">
      <div
        ref={ref}
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
                  <span className="absolute left-1 top-1.5 font-mono text-[11px] leading-none text-ash">{label(t)}</span>
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
              {/* the canvas sizes from its block, so a wider block draws more detail */}
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
        {head !== null && total > 0 && (
          <div aria-hidden className="pointer-events-none absolute top-0 h-full w-px bg-contrast" style={{ left: pct(head) }} />
        )}
      </div>
      <Tools />
    </div>
  )
}

/** The cut that the X shortcut also runs. */
function Tools() {
  const canCut = useAudio((s) => s.current !== null)

  return (
    <div className="mt-2 flex items-center">
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
    </div>
  )
}
