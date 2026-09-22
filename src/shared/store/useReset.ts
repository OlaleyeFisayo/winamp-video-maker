import { create } from "zustand"

type Reset = {
  open: boolean
  /** Registered by the editor, which owns Webamp; the dialog only calls it. */
  runner: (() => Promise<void>) | null
  setOpen: (open: boolean) => void
  setRunner: (runner: Reset["runner"]) => void
}

export const useReset = create<Reset>((set) => ({
  open: false,
  runner: null,
  setOpen: (open) => set({ open }),
  setRunner: (runner) => set({ runner }),
}))
