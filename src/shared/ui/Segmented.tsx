import type { KeyboardEvent } from "react"
import { cn } from "../lib/cn"

type Option<V extends string> = { value: V; label: string }

type Props<V extends string> = {
  options: readonly Option<V>[]
  value: V
  onChange: (value: V) => void
  "aria-label": string
  className?: string
}

export function Segmented<V extends string>({ options, value, onChange, className, ...rest }: Props<V>) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const next = options[(i + dir + options.length) % options.length]
    onChange(next.value)
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[options.indexOf(next)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      className={cn("flex gap-1 rounded-sm border border-rule bg-graphite p-1", className)}
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 flex-1 rounded-xs border px-1 font-mono text-[12px] leading-none transition-colors duration-100",
              "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
              selected ? "border-contrast text-paper" : "border-transparent text-ash hover:text-paper",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
