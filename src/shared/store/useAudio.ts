import { create } from "zustand"

/** A row of the skin playlist, mirrored from Webamp. */
export type Track = { id: number; title: string; url: string; duration: number | null }

export type Status = "PLAYING" | "STOPPED" | "PAUSED"

/** Intent from the UI; the editor owns Webamp and applies these. */
export type Command =
  /** `ids` names the session-file record each file was stored under, in the same order. */
  | { type: "add"; files: File[]; ids: string[] }
  | { type: "remove"; index: number }
  | { type: "move"; from: number; to: number }
  | { type: "play"; index: number }
  | { type: "rename"; index: number; title: string }
  | { type: "toggle" }
  | { type: "seek"; time: number }
  | { type: "next" }
  | { type: "previous" }

type Audio = {
  tracks: Track[]
  current: number | null
  status: Status
  /** Seconds elapsed in the current track, mirrored from Webamp. */
  time: number
  commands: Command[]
  setTracks: (tracks: Track[]) => void
  setCurrent: (index: number | null) => void
  setStatus: (status: Status) => void
  setTime: (time: number) => void
  enqueue: (command: Command) => void
  clearCommands: () => void
}

export const useAudio = create<Audio>((set) => ({
  tracks: [],
  current: null,
  status: "STOPPED",
  time: 0,
  commands: [],
  setTracks: (tracks) => set({ tracks }),
  setCurrent: (current) => set({ current }),
  setStatus: (status) => set({ status }),
  setTime: (time) => set({ time }),
  enqueue: (command) => set((s) => ({ commands: [...s.commands, command] })),
  clearCommands: () => set({ commands: [] }),
}))
