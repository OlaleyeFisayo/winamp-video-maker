import type { Skin } from "./skin"
import { WIN_H, WIN_W } from "./sprites"
import { drawEq, drawMain, drawPlaylist, type SkinState, type TrackInfo } from "./windows"
import { oscilloscope, spectrum } from "./vis"

export type Background = {
  mode: "color" | "image" | "blur" | "transparent"
  color: string
  /** The picture behind the skin: the user's image, or the skin's thumbnail in blur mode. */
  image: ImageBitmap | null
  fit: "cover" | "contain"
  /** Blur radius in output pixels; 0 is sharp. */
  blur: number
}

export type SceneTrack = TrackInfo & { mono: Float32Array; sampleRate: number }

export type Scene = {
  width: number
  height: number
  /** Fraction of the frame height the skin stack occupies, as in the editor. */
  scale: number
  background: Background
  skin: SkinState
  tracks: SceneTrack[]
  /**
   * Rows for the playlist window when they differ from `tracks`, with `offset` marking where
   * `tracks` sits inside them. Absent draws `tracks` itself, as the editor's preview does.
   */
  playlist?: { tracks: TrackInfo[]; offset: number }
}

/** Draws one frame: background, then the skin stack scaled the way the editor shows it. */
export const createRenderer = (skin: Skin, scene: Scene) => {
  const open = [scene.skin.windows.main, scene.skin.windows.equalizer, scene.skin.windows.playlist]
  const stackH = WIN_H * Math.max(1, open.filter(Boolean).length)
  const stack = new OffscreenCanvas(WIN_W, stackH)
  const sctx = stack.getContext("2d")!
  sctx.imageSmoothingEnabled = false

  const zoom = Math.min((scene.height * scene.scale) / (WIN_H * 3), scene.width / WIN_W)
  const outW = Math.round(WIN_W * zoom)
  const outH = Math.round(stackH * zoom)
  const ox = Math.round((scene.width - outW) / 2)
  const oy = Math.round((scene.height - outH) / 2)

  // the background never changes, so it is painted once here — a blur per frame at 4K is not free
  const bg = new OffscreenCanvas(scene.width, scene.height)
  {
    const b = scene.background
    const bctx = bg.getContext("2d")!
    if (b.mode !== "transparent") {
      bctx.fillStyle = b.mode === "color" ? b.color : "#000000"
      bctx.fillRect(0, 0, scene.width, scene.height)
    }
    if ((b.mode === "image" || b.mode === "blur") && b.image) {
      const img = b.image
      // a blurred edge fades to nothing, so a cover image overscans by twice the radius, as the preview does
      const pad = b.fit === "cover" ? 2 * b.blur : 0
      const boxW = scene.width + 2 * pad, boxH = scene.height + 2 * pad
      const scale = b.fit === "cover"
        ? Math.max(boxW / img.width, boxH / img.height)
        : Math.min(boxW / img.width, boxH / img.height)
      const w = img.width * scale, h = img.height * scale
      bctx.imageSmoothingEnabled = true
      if (b.blur > 0) bctx.filter = `blur(${b.blur}px)`
      bctx.drawImage(img, (scene.width - w) / 2, (scene.height - h) / 2, w, h)
    }
  }

  const drawBackground = (ctx: OffscreenCanvasRenderingContext2D) => {
    // transparent frames must start clear; copy mode puts the cached pixels down as they are
    ctx.globalCompositeOperation = "copy"
    ctx.drawImage(bg, 0, 0)
    ctx.globalCompositeOperation = "source-over"
  }

  return {
    render(ctx: OffscreenCanvasRenderingContext2D, trackIndex: number, trackTime: number) {
      const track = scene.tracks[trackIndex]
      // the row this track occupies in the playlist being drawn, which is its real workspace
      // position when the full tracklist is shown
      const rows = scene.playlist?.tracks ?? scene.tracks
      const rowIndex = scene.playlist ? scene.playlist.offset + trackIndex : trackIndex
      const at = Math.floor(trackTime * track.sampleRate)
      const vis = scene.skin.vis === 0 ? spectrum(track.mono, at) : scene.skin.vis === 1 ? oscilloscope(track.mono, at) : null

      sctx.clearRect(0, 0, WIN_W, stackH)
      let y = 0
      if (open[0]) {
        sctx.save(); sctx.translate(0, y)
        drawMain(sctx, skin, scene.skin, track, rowIndex, trackTime, vis)
        sctx.restore(); y += WIN_H
      }
      if (open[1]) {
        sctx.save(); sctx.translate(0, y)
        drawEq(sctx, skin, scene.skin)
        sctx.restore(); y += WIN_H
      }
      if (open[2]) {
        sctx.save(); sctx.translate(0, y)
        drawPlaylist(sctx, skin, rows, rowIndex)
        sctx.restore()
      }

      drawBackground(ctx)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(stack, 0, 0, WIN_W, stackH, ox, oy, outW, outH)
    },
  }
}
