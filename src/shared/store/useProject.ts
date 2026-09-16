import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"

/** Used for the file name, the field's placeholder and the Export tooltip when the name is blank. */
export const DEFAULT_NAME = "semy-elite"

type Project = {
  name: string
  setName: (name: string) => void
}

export const useProject = create<Project>()(
  persist(
    (set) => ({
      name: "",
      setName: (name) => set({ name }),
    }),
    { name: key("project") },
  ),
)
