import { useEffect } from "react"
import { useAudio, type Command } from "../../../shared/store/useAudio"

/** The action each key runs. Shown to the user by the help dialog. */
export const SHORTCUTS: { key: string; label: string; command: Command }[] = [
  { key: "K", label: "Play or pause", command: { type: "toggle" } },
  { key: "J", label: "Previous track", command: { type: "previous" } },
  { key: "L", label: "Next track", command: { type: "next" } },
]

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))

/** Binds the playback shortcuts. Called by the editor, which owns playback. */
export const useShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      const match = SHORTCUTS.find((s) => s.key === e.key.toUpperCase())
      if (!match) return
      e.preventDefault()
      useAudio.getState().enqueue(match.command)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
