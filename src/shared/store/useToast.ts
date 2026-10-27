import { create } from "zustand"

/** A button on the toast; tapping it runs `run` and dismisses the toast. */
type Action = { label: string; run: () => void }

type Toast = { id: number; message: string; action?: Action }

/** A job with real progress, such as loading a template. Only one runs at a time. */
type Progress = { label: string; percent: number; onCancel?: () => void }

type ToastStore = {
  toasts: Toast[]
  progress: Progress | null
  show: (message: string, action?: Action) => void
  dismiss: (id: number) => void
  startProgress: (label: string, onCancel?: () => void) => void
  setProgressLabel: (label: string) => void
  setProgress: (percent: number) => void
  endProgress: () => void
}

let nextId = 1

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  progress: null,
  show: (message, action) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, action }] }))
    // a toast with a button is waiting on a tap, so it stays up longer
    setTimeout(() => get().dismiss(id), action ? 10000 : 3000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  startProgress: (label, onCancel) => set({ progress: { label, percent: 0, onCancel } }),
  setProgressLabel: (label) => set((s) => (s.progress ? { progress: { ...s.progress, label } } : s)),
  setProgress: (percent) =>
    set((s) => (s.progress ? { progress: { ...s.progress, percent: Math.min(100, Math.max(0, percent)) } } : s)),
  endProgress: () => set({ progress: null }),
}))
