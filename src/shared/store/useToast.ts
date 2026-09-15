import { create } from "zustand"

type Toast = { id: number; message: string }

type ToastStore = {
  toasts: Toast[]
  show: (message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => get().dismiss(id), 3000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
