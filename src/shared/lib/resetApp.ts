import { clearExcept, listKeys } from "./sessionFiles"
import { PREFIX, key } from "./storageKeys"
import { useAudio } from "../store/useAudio"
import { useCanvas } from "../store/useCanvas"
import { useFrame } from "../store/useFrame"
import { useProject } from "../store/useProject"
import { useTemplate } from "../store/useTemplate"
import { DEFAULT_TEMPLATE } from "./templates"

/**
 * Not the project's to reset: the theme, the skins the user collected, and how they like to
 * export. Starting a new video should not undo any of that.
 */
const KEEP = [key("theme"), key("saved-skins"), key("export")]

/**
 * Clears the current video — tracks, skin, frame, background and name — and leaves the user's
 * setup alone. Done in place rather than by reloading, so the page the user is looking at is the one
 * that resets. Order matters — see the comments below.
 *
 * The editor owns Webamp, so it passes in how to empty the playlist rather than this module
 * reaching up into the feature that owns it.
 */
export const resetApp = async (clearPlaylist?: () => void) => {
  // 1. Empty the playlist first. The editor's state subscription fires saveSession, whose own
  //    prune deletes the files for the rows that just disappeared, through the normal path.
  clearPlaylist?.()

  // 2. Release the background image's blob URL. Saved skins and template thumbnails keep theirs:
  //    those stay on screen, and revoking them would break the picker and the loaded skin.
  useCanvas.getState().setImage(null)

  // 3. Drop the track audio, its cached waveforms and the background bytes, keeping every saved
  //    skin and every skin thumbnail. Same prune the session restore runs, so both agree on what
  //    outlives a reset.
  const [skins, thumbs] = await Promise.all([listKeys("skin:"), listKeys("thumb:")])
  await clearExcept([...skins, ...thumbs])

  // 4. Back to the defaults each store declares.
  useAudio.setState({ tracks: [], current: null, status: "STOPPED", time: 0, commands: [] })
  useProject.setState({ name: "" })
  useTemplate.setState({ id: DEFAULT_TEMPLATE.id })
  useCanvas.setState({ scale: 0.5, mode: "color", color: "#FFFFFF", image: null, imageName: null, fit: "cover" })
  useFrame.setState({ ratio: "16:9", custom: { width: 1920, height: 1080 } })

  // 5. Only now drop the persisted keys: persist writes on every setState above, so clearing
  //    first would simply write the defaults straight back. KEEP holds the settings that survive,
  //    which must be skipped here too — otherwise they would come back empty on the next reload
  //    while still looking right on screen.
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(PREFIX) && !KEEP.includes(k)) localStorage.removeItem(k)
  }
}
