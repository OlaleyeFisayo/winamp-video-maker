import { useEffect } from "react"
import { playheadTime, useAudio } from "../../../shared/store/useAudio"
import { usePreview } from "../../../shared/store/usePreview"
import { useReset } from "../../../shared/store/useReset"
import { redo, undo } from "./history"

/**
 * The action each key runs. The shortcuts dialog renders this same table, showing `display`
 * in place of the raw key where that reads better.
 */
export const SHORTCUTS: {
  key: string
  label: string
  /** Needs Ctrl (or Cmd) held; without it the key is left alone. */
  ctrl?: boolean
  /** Shown instead of `key` when the key alone would not read clearly. */
  display?: string
  /** Bound, but left out of the dialog because another row already covers it. */
  hidden?: boolean
  run: () => void
}[] = [
  { key: "Z", ctrl: true, label: "Undo", display: "Ctrl + Z", run: undo },
  { key: "Y", ctrl: true, label: "Redo", display: "Ctrl + Y", run: redo },
  { key: "K", label: "Play or pause", display: "K or Space", run: () => useAudio.getState().enqueue({ type: "toggle" }) },
  // the same action on the space bar. e.key for it is " ", which survives toUpperCase unchanged;
  // hidden from the dialog because the row above already names both keys
  {
    key: " ",
    label: "Play or pause",
    hidden: true,
    run: () => useAudio.getState().enqueue({ type: "toggle" }),
  },
  { key: "J", label: "Previous track", run: () => useAudio.getState().enqueue({ type: "previous" }) },
  { key: "L", label: "Next track", run: () => useAudio.getState().enqueue({ type: "next" }) },
  { key: "F", label: "Fullscreen preview", run: () => usePreview.getState().toggle() },
  // opens the confirmation, never resets outright: a stray keypress must not cost a workspace
  { key: "N", label: "Start over", run: () => useReset.getState().setOpen(true) },
  // works while playing and while dragging the thumb: both keep the store's time current
  {
    key: "X",
    label: "Cut at the playhead",
    run: () => {
      const at = playheadTime(useAudio.getState())
      if (at !== null) useAudio.getState().enqueue({ type: "cut", at })
    },
  },
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
      // typing keeps the browser's own Ctrl+Z inside the field
      if (e.altKey || typing(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const match = SHORTCUTS.find((s) => s.key === e.key.toUpperCase() && !!s.ctrl === mod)
      if (!match) return
      e.preventDefault()
      // space would otherwise re-fire whatever button was last clicked, on top of the shortcut
      if (e.key === " " && document.activeElement instanceof HTMLButtonElement) {
        document.activeElement.blur()
      }
      match.run()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
