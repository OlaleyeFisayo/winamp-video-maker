import { create } from "zustand"

type Help = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useHelp = create<Help>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
