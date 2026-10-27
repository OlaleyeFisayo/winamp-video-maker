import { useEffect, useRef, useState } from "react"
import { useAudio } from "../../../shared/store/useAudio"
import { useTemplate } from "../../../shared/store/useTemplate"
import { loadSkin, type Skin } from "../../../shared/lib/export/renderer/skin"
import { drawStack, stackHeight } from "../../../shared/lib/export/renderer/compose"
import { WIN_H, WIN_W, MAIN } from "../../../shared/lib/export/renderer/sprites"
import { getCurrentIndex, getElapsed, getStage, snapshotSkinState } from "../lib/webamp"

// ponytail: the editor never decodes audio, so the bitrate fields are stand-ins; a blur hides them,
// and the export draws the real ones
const STAND_IN = { kbps: 128, khz: 44.1, channels: 2 }

/**
 * The blur background: the skin stack redrawn every frame by the export's own renderer, so the
 * blurred copy plays along with the player in the middle, as the exported video will.
 */
export function LiveBlur({ radius }: { radius: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const archive = useTemplate((s) => s.archive)
  const [skin, setSkin] = useState<Skin | null>(null)

  useEffect(() => {
    if (!archive) return
    let live = true
    loadSkin(archive)
      .then((s) => live && setSkin(s))
      // an unreadable skin leaves the last one up; the player in the middle reports the failure
      .catch(() => {})
    return () => {
      live = false
    }
  }, [archive])

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext("2d")
    if (!skin || !el || !ctx) return
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const st = snapshotSkinState()
      const h = stackHeight(st.windows)
      if (el.height !== h) el.height = h
      const rows = useAudio.getState().tracks.map((t) => ({ title: t.title, duration: t.duration ?? 0, ...STAND_IN }))
      const index = getCurrentIndex() ?? 0
      const track = rows[index] ?? { title: "", duration: 0, ...STAND_IN }
      ctx.clearRect(0, 0, WIN_W, h)
      ctx.imageSmoothingEnabled = false
      // the renderer is typed for the export worker's OffscreenCanvas; the 2D API it uses is the same
      drawStack(ctx as unknown as OffscreenCanvasRenderingContext2D, skin, st, track, rows, index, getElapsed(), null)
      // the visualiser comes from Webamp's own canvas, which already has the live audio
      const vis = getStage().querySelector<HTMLCanvasElement>("#visualizer")
      if (st.windows.main && vis?.width) ctx.drawImage(vis, 0, 0, vis.width, vis.height, MAIN.vis.x, MAIN.vis.y, MAIN.vis.w, MAIN.vis.h)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [skin])

  // a blurred edge fades to nothing, so the layer overscans by twice the radius; the export does the same
  const pad = 2 * radius
  return (
    <canvas
      ref={canvas}
      aria-hidden
      width={WIN_W}
      height={WIN_H * 3}
      className="absolute object-cover"
      style={{
        left: -pad,
        top: -pad,
        width: `calc(100% + ${2 * pad}px)`,
        height: `calc(100% + ${2 * pad}px)`,
        filter: radius > 0 ? `blur(${radius}px)` : undefined,
      }}
    />
  )
}
