import { create } from "zustand"

type ShortcutsDialog = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useShortcutsDialog = create<ShortcutsDialog>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
