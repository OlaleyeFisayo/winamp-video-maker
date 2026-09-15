import { create } from "zustand"

/** A row of the skin playlist, mirrored from Webamp. */
export type Track = { id: number; title: string; url: string; duration: number | null }

/** Intent from the UI; the editor owns Webamp and applies these. */
export type Command =
  | { type: "add"; files: File[] }
  | { type: "remove"; index: number }
  | { type: "play"; index: number }
  | { type: "rename"; index: number; title: string }

type Audio = {
  tracks: Track[]
  current: number | null
  commands: Command[]
  setTracks: (tracks: Track[]) => void
  setCurrent: (index: number | null) => void
  enqueue: (command: Command) => void
  clearCommands: () => void
}

export const useAudio = create<Audio>((set) => ({
  tracks: [],
  current: null,
  commands: [],
  setTracks: (tracks) => set({ tracks }),
  setCurrent: (current) => set({ current }),
  enqueue: (command) => set((s) => ({ commands: [...s.commands, command] })),
  clearCommands: () => set({ commands: [] }),
}))
