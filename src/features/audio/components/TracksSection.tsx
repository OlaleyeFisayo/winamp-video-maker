import { useEffect, useRef, useState } from "react"
import { IconGripVertical, IconMusic, IconPlayerPlay, IconPlus, IconX } from "@tabler/icons-react"
import { Dropzone, IconButton, PanelSection } from "../../../shared/ui"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { acceptsFile } from "../../../shared/lib/acceptsFile"
import { formatTime } from "../../../shared/lib/formatTime"
import { cn } from "../../../shared/lib/cn"

// ponytail: phones often leave file.type empty, so match by extension too
const ACCEPT = "audio/*,.wav,.mp3,.m4a,.aac,.ogg,.oga,.opus,.flac"
const SKIPPED = "Some files weren't audio and were skipped. Use MP3, WAV, OGG or FLAC."

type NameProps = {
  title: string
  editing: boolean
  onEdit: (editing: boolean) => void
  onRename: (title: string) => void
}

// grows the textarea to fit the wrapped name; field-sizing would do it, but not in Firefox
const fit = (el: HTMLTextAreaElement | null) => {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// remounted by key when the mirrored title changes, which resets the raw text
function TrackName({ title, editing, onEdit, onRename }: NameProps) {
  const [raw, setRaw] = useState(title)
  // Escape blurs too, and blur commits; this keeps that blur from saving the edit
  const cancelled = useRef(false)

  if (!editing) {
    return (
      <button
        type="button"
        title={title}
        aria-label={`Rename ${title}`}
        onClick={() => onEdit(true)}
        className="h-7 min-w-0 flex-1 truncate rounded-xs border border-transparent px-1 text-left text-[15px] leading-[1.3] text-paper transition-colors duration-100 hover:border-rule focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
      >
        {title}
      </button>
    )
  }

  const commit = () => {
    // names are one line, so a pasted line break becomes a space
    const next = raw.replace(/\s*\n\s*/g, " ").trim()
    if (!cancelled.current && next && next !== title) onRename(next)
    else setRaw(title)
    cancelled.current = false
    onEdit(false)
  }
  return (
    <textarea
      ref={fit}
      autoFocus
      rows={1}
      aria-label="Track name"
      value={raw}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setRaw(e.target.value)
        fit(e.target)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === "Escape") {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      className="min-h-7 min-w-0 flex-1 resize-none overflow-hidden break-words rounded-xs border border-ash bg-transparent px-1 py-1 text-[15px] leading-[1.3] text-paper focus:outline-none"
    />
  )
}

type RowProps = {
  track: Track
  /** Index in the store; play, rename, remove and keyboard moves use it. */
  index: number
  /** Slot in the drag preview, which is what the number shows and where a hover drops. */
  pos: number
  active: boolean
  count: number
  placeholder: boolean
  onGrab: (index: number) => void
  /** Set only while a row is being dragged. */
  onHover?: (pos: number) => void
}

function Row({ track: t, index: i, pos, active, count, placeholder, onGrab, onHover }: RowProps) {
  const enqueue = useAudio((s) => s.enqueue)
  const [editing, setEditing] = useState(false)
  const move = (to: number) => {
    if (to < 0 || to >= count || to === i) return
    enqueue({ type: "move", from: i, to })
  }
  return (
    <li
      data-active={active || undefined}
      onDragOver={(e) => {
        if (!onHover) return
        // without preventDefault the browser refuses the drop
        e.preventDefault()
        onHover(pos)
      }}
      className={cn(
        "flex shrink-0 gap-1 rounded-sm border bg-graphite px-1 transition-colors duration-100",
        // renaming grows the row so the whole name wraps into view
        editing ? "min-h-11 items-start py-1 md:min-h-9" : "h-11 items-center md:h-9",
        // the dragged row stays in the list as an empty slot marking where it lands
        placeholder ? "border-dashed border-ash *:invisible" : active ? "border-contrast" : "border-rule",
      )}
    >
      {/* the handle drags, not the row: a draggable ancestor breaks text selection in the name input */}
      <button
        type="button"
        draggable={!editing}
        aria-label={`Reorder ${t.title}`}
        onDragStart={(e) => {
          // the handle starts the drag, but the whole row is what follows the pointer
          const row = e.currentTarget.closest("li")
          if (row) {
            const box = row.getBoundingClientRect()
            e.dataTransfer.setDragImage(row, e.clientX - box.left, e.clientY - box.top)
          }
          e.dataTransfer.effectAllowed = "move"
          // Firefox will not start a drag without data
          e.dataTransfer.setData("text/plain", "")
          onGrab(i)
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
        {active ? <IconPlayerPlay size={14} stroke={1.5} aria-hidden className="text-paper" /> : pos + 1}
      </button>
      <TrackName
        key={`${t.id}:${t.title}`}
        title={t.title}
        editing={editing}
        onEdit={setEditing}
        onRename={(title) => enqueue({ type: "rename", index: i, title })}
      />
      {/* hidden while renaming so the name gets the row's width */}
      {!editing && (
        <>
          <span className="shrink-0 font-mono text-[13px] leading-none text-ash">{formatTime(t.duration)}</span>
          <IconButton aria-label={`Remove ${t.title}`} onClick={() => enqueue({ type: "remove", index: i })} className="size-9 md:size-7">
            <IconX size={14} stroke={1.5} aria-hidden />
          </IconButton>
        </>
      )}
    </li>
  )
}

export function TracksSection() {
  // narrow selectors: the store also carries the playhead, which ticks through playback
  const tracks = useAudio((s) => s.tracks)
  const current = useAudio((s) => s.current)
  const enqueue = useAudio((s) => s.enqueue)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const [skipped, setSkipped] = useState(false)
  const dragging = drag !== null

  useEffect(() => {
    list.current?.querySelector("li[data-active]")?.scrollIntoView({ block: "nearest" })
  }, [current])

  // on window, not the handle: Esc or a drop outside the list still ends it, and the
  // handle's own dragend can be lost when the preview reorder moves its row in the DOM
  useEffect(() => {
    if (!dragging) return
    const end = () => setDrag(null)
    window.addEventListener("dragend", end)
    return () => window.removeEventListener("dragend", end)
  }, [dragging])

  // a frame late: turning the row into a placeholder during dragstart makes Chrome
  // cancel the drag or snapshot the empty slot as the drag image
  const onGrab = (i: number) => requestAnimationFrame(() => setDrag({ from: i, to: i }))
  const onHover = (pos: number) => setDrag((d) => (d && d.to !== pos ? { ...d, to: pos } : d))

  // the order the list would have if the drag dropped now
  const order = tracks.map((t, i) => ({ t, i }))
  if (drag) order.splice(drag.to, 0, ...order.splice(drag.from, 1))

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
      // <details> wraps its children in ::details-content, which must flex too or the list never shrinks
      className="md:open:min-h-0 md:open:flex-1 md:open:details-content:flex md:open:details-content:min-h-0 md:open:details-content:flex-1 md:open:details-content:flex-col md:open:details-content:gap-2"
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
        // mobile: 5 rows of 44px plus 4 gaps of 8px, then scrolls. From md: fills the sidebar, then scrolls
        <ol
          ref={list}
          // the gaps between rows accept the drop too
          onDragOver={(e) => drag && e.preventDefault()}
          onDrop={(e) => {
            if (!drag) return
            e.preventDefault()
            if (drag.from !== drag.to) enqueue({ type: "move", from: drag.from, to: drag.to })
            setDrag(null)
          }}
          className="flex max-h-63 flex-col gap-2 overflow-y-auto pr-1 md:max-h-none md:min-h-0 md:flex-1"
        >
          {order.map(({ t, i }, pos) => (
            <Row
              key={t.url}
              track={t}
              index={i}
              pos={pos}
              active={i === current}
              count={tracks.length}
              placeholder={i === drag?.from}
              onGrab={onGrab}
              onHover={drag ? onHover : undefined}
            />
          ))}
        </ol>
      )}
      {skipped && !empty && <p className="text-[15px] leading-normal text-paper underline">{SKIPPED}</p>}
    </PanelSection>
  )
}
