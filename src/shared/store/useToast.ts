import { create } from "zustand"

type Toast = { id: number; message: string }

/** A job with real progress, such as loading a template. Only one runs at a time. */
type Progress = { label: string; percent: number; onCancel?: () => void }

type ToastStore = {
  toasts: Toast[]
  progress: Progress | null
  show: (message: string) => void
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
  show: (message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => get().dismiss(id), 3000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  startProgress: (label, onCancel) => set({ progress: { label, percent: 0, onCancel } }),
  setProgressLabel: (label) => set((s) => (s.progress ? { progress: { ...s.progress, label } } : s)),
  setProgress: (percent) =>
    set((s) => (s.progress ? { progress: { ...s.progress, percent: Math.min(100, Math.max(0, percent)) } } : s)),
  endProgress: () => set({ progress: null }),
}))
