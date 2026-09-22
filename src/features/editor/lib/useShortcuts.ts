import { useEffect } from "react"
import { useAudio } from "../../../shared/store/useAudio"
import { usePreview } from "../../../shared/store/usePreview"
import { useReset } from "../../../shared/store/useReset"

/** The action each key runs. The shortcuts dialog renders this same table. */
export const SHORTCUTS: { key: string; label: string; run: () => void }[] = [
  { key: "K", label: "Play or pause", run: () => useAudio.getState().enqueue({ type: "toggle" }) },
  { key: "J", label: "Previous track", run: () => useAudio.getState().enqueue({ type: "previous" }) },
  { key: "L", label: "Next track", run: () => useAudio.getState().enqueue({ type: "next" }) },
  { key: "F", label: "Fullscreen preview", run: () => usePreview.getState().toggle() },
  // opens the confirmation, never resets outright: a stray keypress must not cost a workspace
  { key: "N", label: "Start over", run: () => useReset.getState().setOpen(true) },
]

/**
 * Listed in the shortcuts dialog but bound locally by the component that owns them, not by the
 * global handler below — they act on whatever row has focus, not on the app as a whole.
 * `hint` is that condition, shown under the label.
 */
export const LOCAL_SHORTCUTS = [
  { key: "Alt + ↑ ↓", label: "Move track up or down", hint: "when a track row is focused" },
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
