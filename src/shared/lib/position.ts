/**
 * Where the skin stack sits in the frame, as fractions 0–1 of the free space on each axis:
 * 0 hugs the left/top edge, 1 the right/bottom, 0.5 is centred.
 */
export type Position = { x: number; y: number }

export const CENTRE: Position = { x: 0.5, y: 0.5 }

export const clampPosition = (p: Position): Position => ({
  x: Math.min(1, Math.max(0, p.x)),
  y: Math.min(1, Math.max(0, p.y)),
})

/** Top-left corner of a `w`×`h` box at `p` in a `W`×`H` frame; editor and export share it. */
export const place = (p: Position, W: number, H: number, w: number, h: number) => ({
  x: (W - w) * p.x,
  y: (H - h) * p.y,
})
