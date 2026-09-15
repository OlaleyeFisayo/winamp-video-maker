import { useState } from "react"
import { PanelSection } from "../../../shared/ui"
import { useCanvas } from "../../../shared/store/useCanvas"

// remounted by key when the committed colour changes, which resets the raw text
function HexField({ value, onCommit }: { value: string; onCommit: (hex: string) => void }) {
  const [raw, setRaw] = useState(value)
  const commit = () => {
    const hex = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`
    if (/^#[0-9a-f]{6}$/i.test(hex)) onCommit(hex)
    else setRaw(value)
  }
  return (
    <input
      aria-label="Background colour, hex"
      value={raw}
      spellCheck={false}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
      }}
      className="h-9 flex-1 rounded-sm border border-rule bg-graphite px-3 font-mono text-[13px] uppercase leading-[1.3] text-paper transition-colors duration-100 hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
    />
  )
}

export function BackgroundSection() {
  const { color, setColor } = useCanvas()

  return (
    <PanelSection title="Background" collapsible>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Background colour"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-9 shrink-0 cursor-pointer appearance-none rounded-sm border border-rule bg-transparent p-0 transition-colors duration-100 hover:border-ash focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-xs [&::-webkit-color-swatch]:border-0"
        />
        <HexField key={color} value={color} onCommit={setColor} />
      </div>
    </PanelSection>
  )
}
