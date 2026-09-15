import { useState } from "react"
import { Button, Dialog, Eyebrow, Segmented } from "../../../shared/ui"
import { useExport, type ExportMode, type Fps, type Resolution } from "../../../shared/store/useExport"
import { useAudio } from "../../../shared/store/useAudio"
import { useCanvas } from "../../../shared/store/useCanvas"
import { describeSelection, parseSelection } from "../lib/parseSelection"

const MODES = [
  { value: "all", label: "All as one" },
  { value: "each", label: "Each track" },
  { value: "selected", label: "Selected" },
] as const

const FPS = [
  { value: "30", label: "30" },
  { value: "60", label: "60" },
] as const

const RES = [
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
  { value: "1440", label: "2K" },
  { value: "2160", label: "4K" },
] as const

const field =
  "h-9 w-full rounded-sm border border-rule bg-graphite px-3 font-mono text-[13px] leading-[1.3] text-paper transition-colors duration-100 placeholder:text-ash hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"

export function ExportDialog() {
  const { open, fps, resolution, mode, selection, running, runner, setOpen, setFps, setResolution, setMode, setSelection } =
    useExport()
  const tracks = useAudio((s) => s.tracks)
  const transparent = useCanvas((s) => s.mode === "transparent")
  const [touched, setTouched] = useState(false)

  // One track makes every mode mean the same thing, so the row is hidden — and a mode left
  // over from a larger playlist must not drive the run or block the button while invisible.
  const multi = tracks.length > 1
  const effectiveMode: ExportMode = multi ? mode : "all"

  const parsed = effectiveMode === "selected" ? parseSelection(selection, tracks.length) : null
  const selectionError = parsed?.error
  const canExport = !running && tracks.length > 0 && !selectionError && !!runner

  const start = () => {
    if (!canExport) return
    const indices = effectiveMode === "selected" ? parsed!.indices! : tracks.map((_, i) => i + 1)
    setOpen(false)
    void runner!({ mode: effectiveMode, indices, fps, resolution })
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Export video"
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!canExport} onClick={start}>
            Export
          </Button>
        </>
      }
    >
      {multi && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Export</Eyebrow>
          <Segmented options={MODES} value={mode} onChange={(v: ExportMode) => setMode(v)} aria-label="What to export" />
          {mode === "selected" && (
            <>
              <input
                aria-label="Tracks to export"
                value={selection}
                placeholder="1-3, 5"
                spellCheck={false}
                onChange={(e) => {
                  setSelection(e.target.value)
                  setTouched(true)
                }}
                className={field}
              />
              <p className={`text-[15px] leading-normal ${selectionError ? "text-paper" : "text-ash"}`}>
                {selectionError
                  ? touched || selection
                    ? selectionError
                    : "Type track numbers, like 1-3 or 1,3,5"
                  : `Exports ${parsed!.indices!.length === 1 ? "track" : "tracks"} ${describeSelection(parsed!.indices!)}`}
              </p>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Eyebrow>Frame rate</Eyebrow>
        <Segmented options={FPS} value={String(fps)} onChange={(v) => setFps(Number(v) as Fps)} aria-label="Frame rate" />
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow>Resolution</Eyebrow>
        <Segmented
          options={RES}
          value={String(resolution)}
          onChange={(v) => setResolution(Number(v) as Resolution)}
          aria-label="Resolution"
        />
      </div>
      <div className="flex flex-col gap-1 text-[15px] leading-normal text-ash">
        {transparent && <p>Exports as a transparent WebM video.</p>}
        {tracks.length === 0 && <p>Add a track to export.</p>}
      </div>
    </Dialog>
  )
}
