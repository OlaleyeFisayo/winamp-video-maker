import {
  IconMaximize,
  IconMinimize,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react"
import { Button } from "../../../shared/ui"
import { useAudio } from "../../../shared/store/useAudio"
import { usePreview } from "../../../shared/store/usePreview"

const square = "size-9 justify-center px-0!"

export function Transport() {
  // primitives only: the store ticks with playback, and none of these change per tick
  const any = useAudio((s) => s.tracks.length > 0)
  const many = useAudio((s) => s.tracks.length > 1)
  const playing = useAudio((s) => s.status === "PLAYING")
  const enqueue = useAudio((s) => s.enqueue)
  const active = usePreview((s) => s.active)
  const toggle = usePreview((s) => s.toggle)

  return (
    <div className="flex h-12 items-center justify-between pt-4">
      <div className="flex items-center gap-2">
        {many && (
          <Button aria-label="Previous track" className={square} onClick={() => enqueue({ type: "previous" })}>
            <IconPlayerSkipBack size={16} stroke={1.5} aria-hidden />
          </Button>
        )}
        {any && (
          <Button aria-label={playing ? "Pause" : "Play"} className={square} onClick={() => enqueue({ type: "toggle" })}>
            {playing ? (
              <IconPlayerPause size={18} stroke={1.5} aria-hidden />
            ) : (
              <IconPlayerPlay size={18} stroke={1.5} aria-hidden />
            )}
          </Button>
        )}
        {many && (
          <Button aria-label="Next track" className={square} onClick={() => enqueue({ type: "next" })}>
            <IconPlayerSkipForward size={16} stroke={1.5} aria-hidden />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={active}
          className={square}
          onClick={toggle}
        >
          {active ? (
            <IconMinimize size={16} stroke={1.5} aria-hidden />
          ) : (
            <IconMaximize size={16} stroke={1.5} aria-hidden />
          )}
        </Button>
      </div>
    </div>
  )
}
