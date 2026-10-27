import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { IconGripVertical, IconMusic, IconPlayerPlay, IconPlus, IconX } from "@tabler/icons-react"
import { Dropzone, IconButton, PanelSection } from "../../../shared/ui"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { acceptsFile } from "../../../shared/lib/acceptsFile"
import { formatTime } from "../../../shared/lib/formatTime"
import { cn } from "../../../shared/lib/cn"

// ponytail: phones often leave file.type empty, so match by extension too
const ACCEPT = "audio/*,.wav,.mp3,.m4a,.aac,.ogg,.oga,.opus,.flac"
const SKIPPED = "Some files weren't audio and were skipped. Use MP3, WAV, OGG or FLAC."
/** How close to the list's top or bottom, in px, a dragged row starts scrolling it. */
const EDGE = 32

type Drag = { from: number; to: number }

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
      className="min-h-7 min-w-0 flex-1 resize-none overflow-hidden wrap-break-word rounded-xs border border-ash bg-transparent px-1 py-1 text-[15px] leading-[1.3] text-paper focus:outline-none"
    />
  )
}

type RowProps = {
  track: Track
  /** Index in the store; play, rename, remove and keyboard moves use it. */
  index: number
  /** Slot in the drag preview, which is what the number shows. */
  pos: number
  active: boolean
  count: number
  placeholder: boolean
  onGrab: (index: number, e: ReactPointerEvent<HTMLElement>) => void
}

function Row({ track: t, index: i, pos, active, count, placeholder, onGrab }: RowProps) {
  const enqueue = useAudio((s) => s.enqueue)
  const [editing, setEditing] = useState(false)
  const move = (to: number) => {
    if (to < 0 || to >= count || to === i) return
    enqueue({ type: "move", from: i, to })
  }
  return (
    <li
      data-active={active || undefined}
      className={cn(
        "flex shrink-0 gap-1 rounded-sm border bg-graphite px-1 transition-colors duration-100",
        // renaming grows the row so the whole name wraps into view
        editing ? "min-h-11 items-start py-1 md:min-h-9" : "h-11 items-center md:h-9",
        // the dragged row stays in the list as an empty slot marking where it lands
        placeholder ? "border-dashed border-ash *:invisible" : active ? "border-contrast" : "border-rule",
      )}
    >
      {/* the handle drags, not the row, so the rest of the row still scrolls the list on touch.
          Pointer events, not HTML5 drag and drop: phones barely fire the latter from a finger */}
      <button
        type="button"
        aria-label={`Reorder ${t.title}`}
        onPointerDown={(e) => {
          if (editing || e.button !== 0) return
          // no focus, text selection or compatibility mouse events from the press
          e.preventDefault()
          onGrab(i, e)
        }}
        onKeyDown={(e) => {
          const dir = e.altKey ? (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0) : 0
          if (!dir) return
          e.preventDefault()
          move(i + dir)
        }}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xs text-ash hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 active:cursor-grabbing md:size-6"
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
  const [drag, setDragState] = useState<Drag | null>(null)
  // mirrored for the window listeners, which outlive the render that attached them
  const dragRef = useRef<Drag | null>(null)
  const setDrag = (d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
  }
  /** Where the grabbed row sat when picked up; the ghost starts there and then follows the pointer. */
  const [grabBox, setGrabBox] = useState<{ left: number; top: number; width: number } | null>(null)
  const pointer = useRef({ y: 0, grab: 0 })
  const ghost = useRef<HTMLDivElement>(null)
  const [skipped, setSkipped] = useState(false)
  const dragging = drag !== null

  useEffect(() => {
    list.current?.querySelector("li[data-active]")?.scrollIntoView({ block: "nearest" })
  }, [current])

  useEffect(() => {
    if (!dragging) return
    const ol = list.current
    // rows are one fixed height, so the slot under the ghost is plain arithmetic
    const retarget = () => {
      const d = dragRef.current
      const first = ol?.querySelector("li")
      if (!d || !ol || !first) return
      const step = first.offsetHeight + parseFloat(getComputedStyle(ol).rowGap || "0")
      const top = pointer.current.y - pointer.current.grab - first.getBoundingClientRect().top
      const to = Math.min(ol.children.length - 1, Math.max(0, Math.round(top / step)))
      if (to !== d.to) setDrag({ ...d, to })
    }
    // window, not the handle: the preview reorder moves the handle's row in the DOM, which
    // drops pointer capture, and the drag must still end wherever the pointer is let go
    const move = (e: PointerEvent) => {
      pointer.current.y = e.clientY
      if (ghost.current) ghost.current.style.top = `${e.clientY - pointer.current.grab}px`
      retarget()
    }
    const end = (commit: boolean) => {
      const d = dragRef.current
      if (commit && d && d.from !== d.to) enqueue({ type: "move", from: d.from, to: d.to })
      setDrag(null)
      setGrabBox(null)
    }
    const up = () => end(true)
    const cancel = () => end(false)
    const key = (e: KeyboardEvent) => e.key === "Escape" && cancel()
    // a held finger near the list's edge keeps scrolling it, faster the closer it gets;
    // the mobile list shows five rows, so this is how a track reaches the sixth
    let raf = 0
    const edge = () => {
      raf = requestAnimationFrame(edge)
      if (!ol) return
      const box = ol.getBoundingClientRect()
      const y = pointer.current.y
      const near = y < box.top + EDGE ? y - (box.top + EDGE) : y > box.bottom - EDGE ? y - (box.bottom - EDGE) : 0
      if (!near) return
      ol.scrollTop += Math.max(-1, Math.min(1, near / EDGE)) * 8
      retarget()
    }
    raf = requestAnimationFrame(edge)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    window.addEventListener("keydown", key)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      window.removeEventListener("keydown", key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attach once per drag; it reads live values through refs
  }, [dragging])

  const onGrab = (i: number, e: ReactPointerEvent<HTMLElement>) => {
    const row = e.currentTarget.closest("li")
    if (!row) return
    const box = row.getBoundingClientRect()
    pointer.current = { y: e.clientY, grab: e.clientY - box.top }
    setGrabBox({ left: box.left, top: box.top, width: box.width })
    setDrag({ from: i, to: i })
  }

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
          className={cn(
            "flex max-h-63 flex-col gap-2 overflow-y-auto pr-1 md:max-h-none md:min-h-0 md:flex-1",
            // a long press mid-drag must not select text or raise the iOS callout
            dragging && "select-none",
          )}
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
            />
          ))}
        </ol>
      )}
      {drag && grabBox && tracks[drag.from] && (
        // the row under the pointer; the placeholder in the list marks where it will land
        <div
          ref={ghost}
          aria-hidden
          className="pointer-events-none fixed z-50 flex h-11 items-center gap-1 rounded-sm border border-paper bg-graphite px-1 shadow-lg select-none md:h-9"
          style={{ left: grabBox.left, top: grabBox.top, width: grabBox.width }}
        >
          <span className="flex size-9 shrink-0 items-center justify-center text-paper md:size-6">
            <IconGripVertical size={14} stroke={1.5} />
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center font-mono text-[13px] leading-none text-ash md:size-6">
            {drag.to + 1}
          </span>
          <span className="min-w-0 flex-1 truncate px-1 text-[15px] leading-[1.3] text-paper">{tracks[drag.from].title}</span>
          <span className="shrink-0 pr-2 font-mono text-[13px] leading-none text-ash">{formatTime(tracks[drag.from].duration)}</span>
        </div>
      )}
      {skipped && !empty && <p className="text-[15px] leading-normal text-paper underline">{SKIPPED}</p>}
    </PanelSection>
  )
}
