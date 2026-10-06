import { create } from "zustand"
import type { useCanvas } from "../../../shared/store/useCanvas"
import type { useFrame } from "../../../shared/store/useFrame"

/**
 * The undo stack's state, kept apart from history.ts so the header and shortcuts dialog can read
 * it without pulling webamp into the entry chunk: history.ts imports webamp, and the editor
 * chunk is the only place that should.
 */

export type Row = { id: string; blob: Blob; title: string; trim: number | null }

export type Snapshot = {
  template: string
  frame: { ratio: ReturnType<typeof useFrame.getState>["ratio"]; custom: { width: number; height: number } }
  canvas: {
    scale: number
    mode: ReturnType<typeof useCanvas.getState>["mode"]
    color: string
    fit: ReturnType<typeof useCanvas.getState>["fit"]
    image: string | null
    imageName: string | null
    imageFile: Blob | null
  }
  playlist: Row[]
}

type History = { past: Snapshot[]; present: Snapshot | null; future: Snapshot[] }

export const useHistory = create<History>(() => ({ past: [], present: null, future: [] }))

// ponytail: history only fills once the editor chunk has loaded it, so by the time there is
// anything to undo this import resolves from cache; before then it is a no-op on empty stacks
export const undo = () => void import("./history").then((m) => m.undo())
export const redo = () => void import("./history").then((m) => m.redo())
