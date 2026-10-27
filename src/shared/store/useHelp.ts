import { create } from "zustand"
import { persist } from "zustand/middleware"
import { key } from "../lib/storageKeys"

type Help = {
  open: boolean
  /** The visitor ticked "Do not show this again"; About then waits for the header button. */
  hideOnStart: boolean
  setOpen: (open: boolean) => void
  setHideOnStart: (hideOnStart: boolean) => void
}

export const useHelp = create<Help>()(
  persist(
    (set) => ({
      open: false,
      hideOnStart: false,
      setOpen: (open) => set({ open }),
      setHideOnStart: (hideOnStart) => set({ hideOnStart }),
    }),
    { name: key("help"), partialize: (s) => ({ hideOnStart: s.hideOnStart }) },
  ),
)

// localStorage hydrates synchronously inside create, so the saved choice is already here
useHelp.setState({ open: !useHelp.getState().hideOnStart })
