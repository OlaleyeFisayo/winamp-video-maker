import type { Skin } from "./skin"
import { CHAR_H, CHAR_W, EQ, FONT, MAIN, PL, WIN_H, WIN_W, type Rect } from "./sprites"
import { BARS } from "./vis"

type Ctx = OffscreenCanvasRenderingContext2D

export type SkinState = {
  volume: number
  balance: number
  eq: { on: boolean; auto: boolean; sliders: Record<string, number> }
  /** 0 bars, 1 oscilloscope, 2 none */
  vis: number
  shuffle: boolean
  repeat: boolean
  windows: { main: boolean; equalizer: boolean; playlist: boolean }
}

export type TrackInfo = { title: string; duration: number; kbps: number; khz: number; channels: number }

const blit = (ctx: Ctx, img: ImageBitmap | undefined, src: Rect, x: number, y: number) => {
  if (img) ctx.drawImage(img, src.x, src.y, src.w, src.h, x, y, src.w, src.h)
}

/** Draws text with the skin's 5x6 bitmap font. Unknown characters fall back to a space. */
export const drawText = (ctx: Ctx, skin: Skin, text: string, x: number, y: number) => {
  const font = skin.sheets["text.bmp"]
  if (!font) return
  ;[...text.toLowerCase()].forEach((c, i) => {
    const [row, col] = FONT[c] ?? FONT[" "]
    ctx.drawImage(font, col * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H, x + i * CHAR_W, y, CHAR_W, CHAR_H)
  })
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

export const drawMain = (
  ctx: Ctx,
  skin: Skin,
  st: SkinState,
  track: TrackInfo,
  index: number,
  t: number,
  vis: number[] | null,
) => {
  const S = skin.sheets
  const bg = S["main.bmp"]
  if (bg) ctx.drawImage(bg, 0, 0, WIN_W, WIN_H, 0, 0, WIN_W, WIN_H)
  blit(ctx, S["titlebar.bmp"], MAIN.titleBar, 0, 0)
  for (const b of MAIN.buttons) blit(ctx, S["cbuttons.bmp"], b.src, b.at[0], b.at[1])

  // elapsed time: the leading minute digit is blank under ten minutes, as Winamp shows it
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const digits = [m >= 10 ? Math.floor(m / 10) : -1, m % 10, Math.floor(s / 10), s % 10]
  digits.forEach((d, i) => {
    if (d >= 0) blit(ctx, S["numbers.bmp"], MAIN.digit(d), MAIN.digitsAt[i][0], MAIN.digitsAt[i][1])
  })

  // marquee: static when it fits, otherwise one cell every 220 ms with the classic separator
  const label = `${index + 1}. ${track.title} (${mmss(track.duration)})`
  ctx.save()
  ctx.beginPath()
  ctx.rect(MAIN.marquee.x, MAIN.marquee.y, MAIN.marquee.w, CHAR_H)
  ctx.clip()
  if (label.length <= MAIN.marquee.chars) {
    drawText(ctx, skin, label, MAIN.marquee.x, MAIN.marquee.y)
  } else {
    const loop = `${label}  ***  `
    const off = Math.floor(t / 0.22) % loop.length
    drawText(ctx, skin, (loop + loop).slice(off, off + MAIN.marquee.chars + 1), MAIN.marquee.x, MAIN.marquee.y)
  }
  ctx.restore()

  drawText(ctx, skin, String(Math.min(999, track.kbps)).padStart(3, " "), MAIN.kbps[0], MAIN.kbps[1])
  drawText(ctx, skin, String(Math.round(track.khz)).padStart(2, " "), MAIN.khz[0], MAIN.khz[1])
  const stereo = track.channels > 1
  blit(ctx, S["monoster.bmp"], stereo ? MAIN.stereo.on : MAIN.stereo.off, MAIN.stereo.at[0], MAIN.stereo.at[1])
  blit(ctx, S["monoster.bmp"], stereo ? MAIN.mono.off : MAIN.mono.on, MAIN.mono.at[0], MAIN.mono.at[1])
  blit(ctx, S["playpaus.bmp"], MAIN.indicator.play, MAIN.indicator.at[0], MAIN.indicator.at[1])

  blit(ctx, S["posbar.bmp"], MAIN.posBg.src, MAIN.posBg.at[0], MAIN.posBg.at[1])
  const frac = track.duration > 0 ? Math.min(1, t / track.duration) : 0
  blit(ctx, S["posbar.bmp"], MAIN.posThumb, MAIN.posBg.at[0] + Math.round(frac * (248 - 29)), MAIN.posBg.at[1])

  const vol = Math.max(0, Math.min(100, st.volume)) / 100
  const vf = Math.round(vol * (MAIN.volume.frames - 1))
  const V = MAIN.volume
  blit(ctx, S["volume.bmp"], { x: 0, y: vf * V.frameH, w: V.w, h: 13 }, V.at[0], V.at[1])
  blit(ctx, S["volume.bmp"], V.thumb, V.at[0] + Math.round(vol * (V.w - 14)), V.at[1] + 1)
  const bal = Math.max(-100, Math.min(100, st.balance))
  const bf = Math.round((Math.abs(bal) / 100) * (MAIN.balance.frames - 1))
  const B = MAIN.balance
  blit(ctx, S["balance.bmp"], { x: B.srcX, y: bf * B.frameH, w: B.w, h: 13 }, B.at[0], B.at[1])
  blit(ctx, S["balance.bmp"], B.thumb, B.at[0] + Math.round(((bal + 100) / 200) * (B.w - 14)), B.at[1] + 1)

  blit(ctx, S["shufrep.bmp"], st.shuffle ? MAIN.shuffle.on : MAIN.shuffle.off, MAIN.shuffle.at[0], MAIN.shuffle.at[1])
  blit(ctx, S["shufrep.bmp"], st.repeat ? MAIN.repeat.on : MAIN.repeat.off, MAIN.repeat.at[0], MAIN.repeat.at[1])
  const eqBtn = st.windows.equalizer ? MAIN.eqButton.on : MAIN.eqButton.off
  blit(ctx, S["shufrep.bmp"], eqBtn, MAIN.eqButton.at[0], MAIN.eqButton.at[1])
  const plBtn = st.windows.playlist ? MAIN.plButton.on : MAIN.plButton.off
  blit(ctx, S["shufrep.bmp"], plBtn, MAIN.plButton.at[0], MAIN.plButton.at[1])

  // visualiser
  const v = MAIN.vis
  ctx.fillStyle = skin.visColors[0]
  ctx.fillRect(v.x, v.y, v.w, v.h)
  if (vis && st.vis === 0) {
    for (let b = 0; b < BARS; b++) {
      const h = vis[b]
      for (let row = 0; row < h; row++) {
        ctx.fillStyle = skin.visColors[2 + Math.min(15, 15 - row)]
        ctx.fillRect(v.x + b * 4, v.y + v.h - 1 - row, 3, 1)
      }
      if (h > 0) {
        ctx.fillStyle = skin.visColors[23]
        ctx.fillRect(v.x + b * 4, v.y + v.h - 1 - h, 3, 1)
      }
    }
  } else if (vis && st.vis === 1) {
    for (let i = 0; i < vis.length; i++) {
      const y = vis[i]
      ctx.fillStyle = skin.visColors[18 + Math.min(4, Math.floor(Math.abs(y - 8) / 2))]
      ctx.fillRect(v.x + i, v.y + y, 1, 1)
    }
  }
}

export const drawEq = (ctx: Ctx, skin: Skin, st: SkinState) => {
  const sheet = skin.sheets["eqmain.bmp"]
  if (!sheet) return
  ctx.drawImage(sheet, 0, 0, WIN_W, WIN_H, 0, 0, WIN_W, WIN_H)
  blit(ctx, sheet, EQ.titleBar, 0, 0)
  blit(ctx, sheet, st.eq.on ? EQ.on.on : EQ.on.off, EQ.on.at[0], EQ.on.at[1])
  blit(ctx, sheet, st.eq.auto ? EQ.auto.on : EQ.auto.off, EQ.auto.at[0], EQ.auto.at[1])
  blit(ctx, sheet, EQ.presets.src, EQ.presets.at[0], EQ.presets.at[1])
  blit(ctx, sheet, EQ.graph.bg, EQ.graph.at[0], EQ.graph.at[1])

  const value = (key: string) => Math.max(0, Math.min(100, st.eq.sliders[key] ?? 50))
  const thumbY = (v: number) => EQ.sliderTop + Math.round(((100 - v) / 100) * EQ.sliderTravel)
  blit(ctx, sheet, EQ.thumb, EQ.preampX + 1, thumbY(value("preamp")))
  EQ.bandX.forEach((x, i) => blit(ctx, sheet, EQ.thumb, x + 1, thumbY(value(EQ.bandKeys[i]))))

  // graph: a polyline through the ten bands, coloured from the sheet's own line palette
  const g = EQ.graph
  for (let px = 0; px < g.bg.w; px++) {
    const pos = (px / (g.bg.w - 1)) * (EQ.bandKeys.length - 1)
    const i = Math.min(EQ.bandKeys.length - 2, Math.floor(pos))
    const f = pos - i
    const v = value(EQ.bandKeys[i]) * (1 - f) + value(EQ.bandKeys[i + 1]) * f
    const y = Math.round(((100 - v) / 100) * (g.bg.h - 1))
    ctx.drawImage(sheet, g.colors.x, g.colors.y + y, 1, 1, g.at[0] + px, g.at[1] + y, 1, 1)
  }
}

export const drawPlaylist = (ctx: Ctx, skin: Skin, tracks: TrackInfo[], current: number) => {
  const sheet = skin.sheets["pledit.bmp"]
  if (!sheet) return
  ctx.fillStyle = skin.pledit.normalBg
  ctx.fillRect(0, 0, WIN_W, WIN_H)
  blit(ctx, sheet, PL.topLeft, 0, 0)
  for (let x = 25; x < 250; x += 25) blit(ctx, sheet, PL.topTile, x, 0)
  blit(ctx, sheet, PL.title, Math.round((WIN_W - PL.title.w) / 2), 0)
  blit(ctx, sheet, PL.topRight, WIN_W - 25, 0)
  for (let y = 20; y < 78; y += 29) {
    blit(ctx, sheet, PL.leftTile, 0, y)
    blit(ctx, sheet, PL.rightTile, WIN_W - 20, y)
  }
  blit(ctx, sheet, PL.bottomLeft, 0, 78)
  blit(ctx, sheet, PL.bottomRight, 125, 78)

  const L = PL.list
  ctx.save()
  ctx.beginPath()
  ctx.rect(L.x, L.y, L.w, L.h)
  ctx.clip()
  ctx.fillStyle = skin.pledit.normalBg
  ctx.fillRect(L.x, L.y, L.w, L.h)
  ctx.font = `9px ${skin.pledit.font}, Arial, sans-serif`
  ctx.textBaseline = "middle"
  const visibleRows = Math.floor(L.h / L.row)
  const first = Math.max(0, Math.min(current - Math.floor(visibleRows / 2), tracks.length - visibleRows))
  tracks.slice(first, first + visibleRows).forEach((tr, i) => {
    const idx = first + i
    const y = L.y + i * L.row
    if (idx === current) {
      ctx.fillStyle = skin.pledit.selectedBg
      ctx.fillRect(L.x, y, L.w, L.row)
    }
    ctx.fillStyle = idx === current ? skin.pledit.current : skin.pledit.normal
    ctx.textAlign = "left"
    ctx.fillText(`${idx + 1}. ${tr.title}`, L.x + 3, y + L.row / 2 + 1, L.w - 40)
    ctx.textAlign = "right"
    ctx.fillText(mmss(tr.duration), L.x + L.w - 3, y + L.row / 2 + 1)
  })
  ctx.restore()

  // Winamp shows the selected tracks' summed duration here, not a clock; the editor selects
  // the playing row (CLICKED_TRACK), so that is one track's length
  drawText(ctx, skin, mmss(tracks[current]?.duration ?? 0), PL.miniTime[0], PL.miniTime[1])
}
