import { useEffect, useRef, useState } from "react"
import { IconGripVertical, IconMusic, IconPlayerPlay, IconPlus, IconX } from "@tabler/icons-react"
import { Dropzone, IconButton, PanelSection } from "../../../shared/ui"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { acceptsFile } from "../../../shared/lib/acceptsFile"
import { formatTime } from "../../../shared/lib/formatTime"
import { cn } from "../../../shared/lib/cn"

const ACCEPT = "audio/*"
const SKIPPED = "Some files weren't audio and were skipped. Use MP3, WAV, OGG or FLAC."

type NameProps = { title: string; onRename: (title: string) => void }

// remounted by key when the mirrored title changes, which resets the raw text
function TrackName({ title, onRename }: NameProps) {
  const [raw, setRaw] = useState(title)
  const commit = () => {
    const next = raw.trim()
    if (next && next !== title) onRename(next)
    else setRaw(title)
  }
  return (
    <input
      aria-label="Track name"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setRaw(title)
          e.currentTarget.blur()
        }
      }}
      className="h-7 min-w-0 flex-1 truncate rounded-xs border border-transparent bg-transparent px-1 text-[15px] leading-[1.3] text-paper transition-colors duration-100 hover:border-rule focus:border-ash focus:outline-none"
    />
  )
}

type RowProps = {
  track: Track
  index: number
  active: boolean
  count: number
  draggingRef: { current: number | null }
}

function Row({ track: t, index: i, active, count, draggingRef }: RowProps) {
  const enqueue = useAudio((s) => s.enqueue)
  const [over, setOver] = useState(false)
  const move = (to: number) => {
    if (to < 0 || to >= count || to === i) return
    enqueue({ type: "move", from: i, to })
  }
  return (
    <li
      data-active={active || undefined}
      onDragOver={(e) => {
        if (draggingRef.current === null || draggingRef.current === i) return
        // without preventDefault the browser refuses the drop
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const from = draggingRef.current
        draggingRef.current = null
        // the dragged row is `from`; this row is where it lands
        if (from !== null && from !== i) enqueue({ type: "move", from, to: i })
      }}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1 rounded-sm border bg-graphite px-1 transition-colors duration-100 md:h-9",
        over ? "border-paper" : active ? "border-contrast" : "border-rule",
      )}
    >
      {/* the handle drags, not the row: a draggable ancestor breaks text selection in the name input */}
      <button
        type="button"
        draggable
        aria-label={`Reorder ${t.title}`}
        onDragStart={() => {
          draggingRef.current = i
        }}
        onDragEnd={() => {
          draggingRef.current = null
          setOver(false)
        }}
        onKeyDown={(e) => {
          const dir = e.altKey ? (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0) : 0
          if (!dir) return
          e.preventDefault()
          move(i + dir)
        }}
        className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-xs text-ash hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 active:cursor-grabbing md:size-6"
      >
        <IconGripVertical size={14} stroke={1.5} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Play ${t.title}`}
        onClick={() => enqueue({ type: "play", index: i })}
        className="flex size-9 shrink-0 items-center justify-center rounded-xs font-mono md:size-6 text-[13px] leading-none text-ash hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
      >
        {active ? <IconPlayerPlay size={14} stroke={1.5} aria-hidden className="text-paper" /> : i + 1}
      </button>
      <TrackName
        key={`${t.id}:${t.title}`}
        title={t.title}
        onRename={(title) => enqueue({ type: "rename", index: i, title })}
      />
      <span className="shrink-0 font-mono text-[13px] leading-none text-ash">{formatTime(t.duration)}</span>
      <IconButton aria-label={`Remove ${t.title}`} onClick={() => enqueue({ type: "remove", index: i })} className="size-9 md:size-7">
        <IconX size={14} stroke={1.5} aria-hidden />
      </IconButton>
    </li>
  )
}

export function TracksSection() {
  const { tracks, current, enqueue } = useAudio()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const dragging = useRef<number | null>(null)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    list.current?.querySelector("li[data-active]")?.scrollIntoView({ block: "nearest" })
  }, [current])

  const onPick = (files: File[]) => {
    setSkipped(false)
    if (!files.length) return
    const ids = files.map(() => crypto.randomUUID())
    enqueue({ type: "add", files, ids })
  }

  const onInput = (picked: FileList | null) => {
    const files = [...(picked ?? [])]
    const ok = files.filter((f) => acceptsFile(f, ACCEPT))
    onPick(ok)
    if (ok.length < files.length) setSkipped(true)
  }

  const empty = tracks.length === 0

  return (
    <PanelSection
      title="Tracks"
      collapsible
      action={
        !empty && (
          <IconButton aria-label="Add tracks" className="size-9 md:size-7" onClick={() => input.current?.click()}>
            <IconPlus size={16} stroke={1.5} aria-hidden />
          </IconButton>
        )
      }
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          onInput(e.target.files)
          e.target.value = ""
        }}
      />
      {empty ? (
        <Dropzone
          accept={ACCEPT}
          multiple
          onFiles={onPick}
          onReject={() => setSkipped(true)}
          error={skipped ? SKIPPED : undefined}
          icon={<IconMusic size={16} stroke={1.5} aria-hidden />}
        >
          Drop MP3 or WAV files here.
        </Dropzone>
      ) : (
        // 5 rows plus 4 gaps of 8px; more than that scrolls. Rows are 44px on touch, 36px from md
        <ol ref={list} className="flex max-h-63 flex-col gap-2 overflow-y-auto pr-1 md:max-h-53">
          {tracks.map((t, i) => (
            <Row key={t.url} track={t} index={i} active={i === current} count={tracks.length} draggingRef={dragging} />
          ))}
        </ol>
      )}
      {skipped && !empty && <p className="text-[15px] leading-normal text-paper underline">{SKIPPED}</p>}
    </PanelSection>
  )
}
