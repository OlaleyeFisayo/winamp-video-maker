import { useEffect } from "react"
import { useAudio } from "../../../shared/store/useAudio"
import { usePreview } from "../../../shared/store/usePreview"

/** The action each key runs. The help dialog renders this same table. */
export const SHORTCUTS: { key: string; label: string; run: () => void }[] = [
  { key: "K", label: "Play or pause", run: () => useAudio.getState().enqueue({ type: "toggle" }) },
  { key: "J", label: "Previous track", run: () => useAudio.getState().enqueue({ type: "previous" }) },
  { key: "L", label: "Next track", run: () => useAudio.getState().enqueue({ type: "next" }) },
  { key: "F", label: "Fullscreen preview", run: () => usePreview.getState().toggle() },
]

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))

/** Binds the shortcuts. Called by the editor, which owns playback and the preview. */
export const useShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      const match = SHORTCUTS.find((s) => s.key === e.key.toUpperCase())
      if (!match) return
      e.preventDefault()
      match.run()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
