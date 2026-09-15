import { IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward, IconPlayerPause } from "@tabler/icons-react"
import { Button } from "../../../shared/ui"
import { useAudio } from "../../../shared/store/useAudio"

const square = "size-9 justify-center px-0!"

export function Transport() {
  const { tracks, status, enqueue } = useAudio()
  const many = tracks.length > 1
  const playing = status === "PLAYING"

  return (
    <div className="flex h-12 items-center gap-2 pt-4">
      {many && (
        <Button aria-label="Previous track" className={square} onClick={() => enqueue({ type: "previous" })}>
          <IconPlayerSkipBack size={16} stroke={1.5} aria-hidden />
        </Button>
      )}
      {tracks.length > 0 && (
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
  )
}
