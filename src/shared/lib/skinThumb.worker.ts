/// <reference lib="webworker" />
import { loadSkinFromBuffer } from "./export/renderer/skin"
import { WIN_H, WIN_W } from "./export/renderer/sprites"
import { drawEq, drawMain, drawPlaylist, type SkinState, type TrackInfo } from "./export/renderer/windows"

/**
 * A still preview has no live Webamp to read, so the windows are drawn as a plausible
 * paused player. This is what makes a local preview match the museum screenshots.
 */
const PREVIEW_STATE: SkinState = {
  volume: 78,
  balance: 0,
  eq: { on: true, auto: false, sliders: {} }, // missing bands default to 50 (flat) in drawEq
  vis: 2, // none: a still frame of bars reads as noise
  shuffle: false,
  repeat: false,
  windows: { main: true, equalizer: true, playlist: true },
}

const PREVIEW_TRACKS: TrackInfo[] = [
  { title: "Winamp Video Maker", duration: 212, kbps: 192, khz: 44.1, channels: 2 },
]

/** Puts the timer at 0:42 and the position thumb a fifth in, so the window looks alive. */
const PREVIEW_T = 42

export type ThumbRequest = { id: number; archive: ArrayBuffer }
export type ThumbResponse = { id: number; blob: Blob | null }

/** The skin's main+EQ+playlist windows stacked at 275x348 as a PNG, or null when unreadable. */
const render = async (archive: ArrayBuffer): Promise<Blob | null> => {
  try {
    const skin = await loadSkinFromBuffer(archive)
    // no main art means this is not a classic skin the renderer can draw
    if (!skin.sheets["main.bmp"]) return null
    const canvas = new OffscreenCanvas(WIN_W, WIN_H * 3)
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingEnabled = false
    drawMain(ctx, skin, PREVIEW_STATE, PREVIEW_TRACKS[0], 0, PREVIEW_T, null)
    ctx.translate(0, WIN_H)
    drawEq(ctx, skin, PREVIEW_STATE)
    ctx.translate(0, WIN_H)
    drawPlaylist(ctx, skin, PREVIEW_TRACKS, 0)
    return await canvas.convertToBlob({ type: "image/png" })
  } catch {
    return null
  }
}

self.onmessage = async (e: MessageEvent<ThumbRequest>) => {
  const blob = await render(e.data.archive)
  self.postMessage({ id: e.data.id, blob } satisfies ThumbResponse)
}
