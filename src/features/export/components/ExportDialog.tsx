import { Button, Dialog, Eyebrow, Segmented } from "../../../shared/ui"
import { useExport, type Fps, type Resolution } from "../../../shared/store/useExport"
import { frameSize, useFrame } from "../../../shared/store/useFrame"
import { useProject } from "../../../shared/store/useProject"
import { exportSize } from "../../../shared/lib/presets"

const FPS = [
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
] as const

const RES = [
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
  { value: "1440", label: "2K" },
  { value: "2160", label: "4K" },
] as const

export function ExportDialog() {
  const { open, fps, resolution, setOpen, setFps, setResolution } = useExport()
  const ratio = useFrame(frameSize)
  const name = useProject((s) => s.name.trim() || "Untitled video")
  const size = exportSize(ratio, resolution)

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Export video"
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          {/* ponytail: encoding lands with the export feature; this only records the choice */}
          <Button variant="primary" onClick={() => setOpen(false)}>
            Export video
          </Button>
        </>
      }
    >
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
      <p className="text-[15px] leading-normal text-ash">
        Exports <span className="font-mono text-[13px] text-paper">{size.width} × {size.height}</span> at{" "}
        <span className="font-mono text-[13px] text-paper">{fps} fps</span> as {name}.mp4
      </p>
    </Dialog>
  )
}
