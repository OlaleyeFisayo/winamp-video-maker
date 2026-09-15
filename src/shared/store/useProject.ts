import { create } from "zustand"

type Project = {
  name: string
  setName: (name: string) => void
}

export const useProject = create<Project>((set) => ({
  name: "",
  setName: (name) => set({ name }),
}))
