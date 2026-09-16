import { useState } from "react"
import { PanelSection } from "../../../shared/ui"
import { useCanvas } from "../../../shared/store/useCanvas"

const field =
  "h-9 w-16 rounded-sm border border-rule bg-graphite px-2 text-right font-mono text-[13px] leading-[1.3] text-paper transition-colors duration-100 hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"

// remounted by key when the committed value changes, which resets the raw text
function PercentField({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [raw, setRaw] = useState(String(value))
  const commit = () => {
    const n = Number(raw)
    if (raw.trim() !== "" && Number.isFinite(n)) onCommit(n)
    else setRaw(String(value))
  }
  return (
    <label className="flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        aria-label="Template size, percent of frame height"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className={field}
      />
      <span className="font-mono text-[13px] text-ash">%</span>
    </label>
  )
}

export function SizeSection() {
  const { scale, setScale } = useCanvas()
  const percent = Math.round(scale * 100)

  return (
    <PanelSection title="Size" collapsible>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          aria-label="Template size"
          value={percent}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          className="h-2 flex-1 cursor-pointer accent-contrast md:h-1"
        />
        <PercentField key={percent} value={percent} onCommit={(n) => setScale(n / 100)} />
      </div>
    </PanelSection>
  )
}
