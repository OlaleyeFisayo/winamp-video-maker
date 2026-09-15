import { useState } from "react"
import { PanelSection, Segmented } from "../../../shared/ui"
import { useFrame } from "../../../shared/store/useFrame"
import { PRESETS, type PresetId } from "../../../shared/lib/presets"

type Choice = PresetId | "custom"

const OPTIONS: readonly { value: Choice; label: string }[] = [
  ...PRESETS.map((p) => ({ value: p.id, label: p.id })),
  { value: "custom", label: "Custom" },
]

type SizeFieldProps = { label: string; value: number; onCommit: (n: number) => void }

// remounted by key when the committed value changes, which resets the raw text
function SizeField({ label, value, onCommit }: SizeFieldProps) {
  const [raw, setRaw] = useState(String(value))
  const commit = () => {
    const n = Number(raw)
    if (raw.trim() !== "" && Number.isFinite(n)) onCommit(n)
    else setRaw(String(value))
  }
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ash">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className="h-9 w-full rounded-sm border border-rule bg-graphite px-3 font-mono text-[13px] leading-[1.3] text-paper transition-colors duration-100 hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
      />
    </label>
  )
}

export function FrameSection() {
  const { ratio, custom, setRatio, setCustom } = useFrame()

  return (
    <PanelSection title="Frame" collapsible>
      <Segmented options={OPTIONS} value={ratio} onChange={setRatio} aria-label="Aspect ratio" />
      {ratio === "custom" && (
        <div className="flex items-end gap-2">
          <SizeField key={custom.width} label="W" value={custom.width} onCommit={(width) => setCustom({ width })} />
          <span className="pb-2 font-mono text-[13px] text-ash">×</span>
          <SizeField key={custom.height} label="H" value={custom.height} onCommit={(height) => setCustom({ height })} />
        </div>
      )}
    </PanelSection>
  )
}
