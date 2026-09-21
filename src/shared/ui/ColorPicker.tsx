import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { hexToHsl, hexToRgb, hslToHex, type Hsl } from "../lib/color"
import { Eyebrow } from "./Eyebrow"

type Props = {
  value: string
  onChange: (hex: string) => void
  "aria-label": string
}

type Rail = {
  key: keyof Hsl
  label: string
  max: number
  /** Trailing unit on the readout; degrees for hue, percent for the rest. */
  unit: string
  /** The rail's own gradient, drawn from the current colour so it previews the result. */
  track: (hsl: Hsl) => string
}

const RAILS: readonly Rail[] = [
  {
    key: "h",
    label: "Hue",
    max: 360,
    unit: "°",
    track: ({ s, l }) =>
      `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
        .map((h) => hslToHex({ h, s: Math.max(s, 10), l: Math.min(Math.max(l, 20), 80) }))
        .join(", ")})`,
  },
  {
    key: "s",
    label: "Saturation",
    max: 100,
    unit: "%",
    track: ({ h, l }) => `linear-gradient(to right, ${hslToHex({ h, s: 0, l })}, ${hslToHex({ h, s: 100, l })})`,
  },
  {
    key: "l",
    label: "Lightness",
    max: 100,
    unit: "%",
    track: ({ h, s }) =>
      `linear-gradient(to right, #000000, ${hslToHex({ h, s, l: 50 })}, #FFFFFF)`,
  },
]

/**
 * Colour as instrument readout: three gradient rails and a numeric line, in the app's own
 * chrome. Replaces <input type="color">, whose popup is OS chrome and cannot be styled.
 */
export function ColorPicker({ value, onChange, ...rest }: Props) {
  const popoverId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // HSL is held here while open: hex -> HSL -> hex is lossy, so re-deriving it from the
  // committed colour every render would make the rails drift under the pointer.
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(value))

  // no CSS anchor positioning in Safari or Firefox yet, so place it from the trigger's box
  useEffect(() => {
    if (!open) return
    const place = () => {
      const t = trigger.current, p = popover.current
      if (!t || !p) return
      const box = t.getBoundingClientRect()
      const { width, height } = p.getBoundingClientRect()
      const gap = 8
      const below = box.bottom + gap
      // flip above when the panel would run off the bottom
      const top = below + height > window.innerHeight && box.top - gap - height > 0 ? box.top - gap - height : below
      p.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - height - gap))}px`
      p.style.left = `${Math.max(gap, Math.min(box.left, window.innerWidth - width - gap))}px`
    }
    place()
    window.addEventListener("resize", place)
    // the panel scrolls, so the popover has to follow its trigger
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  const commit = (next: Hsl) => {
    setHsl(next)
    onChange(hslToHex(next))
  }

  const dragTo = (rail: Rail, el: HTMLElement, clientX: number) => {
    const box = el.getBoundingClientRect()
    const ratio = box.width ? (clientX - box.left) / box.width : 0
    commit({ ...hsl, [rail.key]: Math.min(1, Math.max(0, ratio)) * rail.max })
  }

  const onPointerDown = (rail: Rail) => (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus()
    dragTo(rail, e.currentTarget, e.clientX)
  }

  const onPointerMove = (rail: Rail) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(rail, e.currentTarget, e.clientX)
  }

  const onKeyDown = (rail: Rail) => (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1
    const current = hsl[rail.key]
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? current + step :
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? current - step :
      e.key === "Home" ? 0 :
      e.key === "End" ? rail.max :
      null
    if (next === null) return
    e.preventDefault()
    commit({ ...hsl, [rail.key]: Math.min(rail.max, Math.max(0, next)) })
  }

  const rgb = hexToRgb(hslToHex(hsl))

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={rest["aria-label"]}
        aria-expanded={open}
        popoverTarget={popoverId}
        className="size-9 shrink-0 cursor-pointer rounded-sm border border-rule bg-graphite p-1 transition-colors duration-100 hover:border-ash focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
      >
        <span className="block size-full rounded-xs" style={{ background: value }} />
      </button>

      <div
        ref={popover}
        id={popoverId}
        popover="auto"
        onToggle={(e: { newState: string }) => {
          const opening = e.newState === "open"
          setOpen(opening)
          // seed from the committed colour on open, so an edit made in the hex field
          // (or anywhere else) is what the rails start from
          if (opening) setHsl(hexToHsl(value))
        }}
        // fixed, because the popover sits in the top layer where the panel cannot clip it
        className="fixed m-0 w-60 flex-col gap-3 rounded-sm border border-rule bg-graphite p-4 text-paper open:flex motion-safe:animate-[fade-in_120ms_ease-out]"
      >
        {RAILS.map((rail) => {
          const v = hsl[rail.key]
          return (
            <div key={rail.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <Eyebrow>{rail.label}</Eyebrow>
                <span className="font-mono text-[13px] leading-none text-ash tabular-nums">
                  {Math.round(v)}
                  {rail.unit}
                </span>
              </div>
              <div
                role="slider"
                aria-label={rail.label}
                aria-valuemin={0}
                aria-valuemax={rail.max}
                aria-valuenow={Math.round(v)}
                aria-valuetext={`${Math.round(v)}${rail.unit}`}
                tabIndex={0}
                onPointerDown={onPointerDown(rail)}
                onPointerMove={onPointerMove(rail)}
                onKeyDown={onKeyDown(rail)}
                style={{ backgroundImage: rail.track(hsl) }}
                // taller on touch, where the rail is also the hit target
                className="relative h-6 cursor-pointer rounded-xs border border-rule bg-graphite focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 md:h-4"
              >
                <span
                  aria-hidden
                  // the thumb rides the rail, so it carries its own contrast on both ends.
                  // Travel is inset by its own width so it never hangs off either end.
                  className="pointer-events-none absolute top-1/2 h-full w-1 -translate-x-1/2 -translate-y-1/2 rounded-xs border border-ink bg-contrast"
                  style={{ left: `calc(2px + ${(v / rail.max) * 100}% - ${(v / rail.max) * 4}px)` }}
                />
              </div>
            </div>
          )
        })}

        <div className="flex justify-between border-t border-rule pt-3 font-mono text-[13px] leading-none text-ash tabular-nums">
          <span>R {rgb.r}</span>
          <span>G {rgb.g}</span>
          <span>B {rgb.b}</span>
        </div>
      </div>
    </>
  )
}
