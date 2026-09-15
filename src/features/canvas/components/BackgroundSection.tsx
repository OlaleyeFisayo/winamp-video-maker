import { useState } from "react"
import { IconPhoto, IconX } from "@tabler/icons-react"
import { Dropzone, IconButton, PanelSection, Segmented } from "../../../shared/ui"
import { useCanvas, type BackgroundMode, type Fit } from "../../../shared/store/useCanvas"

const MODES = [
  { value: "color", label: "Colour" },
  { value: "image", label: "Image" },
  { value: "transparent", label: "None" },
] as const

const FITS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
] as const

const REJECT = "That isn't an image. Choose a PNG, JPG or WEBP."

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
  const { mode, color, image, imageName, fit, setMode, setColor, setImage, setFit } = useCanvas()
  const [rejected, setRejected] = useState(false)

  return (
    <PanelSection title="Background" collapsible>
      <Segmented
        options={MODES}
        value={mode}
        onChange={(v: BackgroundMode) => setMode(v)}
        aria-label="Background type"
      />

      {mode === "color" && (
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
      )}

      {mode === "image" &&
        (image ? (
          <>
            <div className="flex items-center gap-2 rounded-sm border border-rule bg-graphite p-2">
              <img src={image} alt="" className="size-9 shrink-0 rounded-xs object-cover" />
              <p className="min-w-0 flex-1 truncate text-[15px] leading-[1.3] text-paper">{imageName}</p>
              <IconButton aria-label="Remove image" className="size-7" onClick={() => setImage(null)}>
                <IconX size={14} stroke={1.5} aria-hidden />
              </IconButton>
            </div>
            <Segmented options={FITS} value={fit} onChange={(v: Fit) => setFit(v)} aria-label="Image fit" />
          </>
        ) : (
          <Dropzone
            accept="image/*"
            onFiles={(files) => {
              setRejected(false)
              setImage(files[0])
            }}
            onReject={() => setRejected(true)}
            error={rejected ? REJECT : undefined}
            icon={<IconPhoto size={16} stroke={1.5} aria-hidden />}
          >
            Drop an image here.
          </Dropzone>
        ))}
      {mode === "transparent" && (
        <p className="text-[15px] leading-normal text-ash">Exports as a transparent WebM video.</p>
      )}
    </PanelSection>
  )
}
