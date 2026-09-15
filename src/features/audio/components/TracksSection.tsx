import { useEffect, useRef, useState } from "react"
import { IconMusic, IconPlayerPlay, IconPlus, IconX } from "@tabler/icons-react"
import { Dropzone, IconButton, PanelSection } from "../../../shared/ui"
import { useAudio, type Track } from "../../../shared/store/useAudio"
import { useProject } from "../../../shared/store/useProject"
import { acceptsFile } from "../../../shared/lib/acceptsFile"
import { formatTime } from "../../../shared/lib/formatTime"
import { stripExt } from "../../../shared/lib/stripExt"
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

type RowProps = { track: Track; index: number; active: boolean }

function Row({ track: t, index: i, active }: RowProps) {
  const enqueue = useAudio((s) => s.enqueue)
  return (
    <li
      data-active={active || undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-sm border bg-graphite pl-2 pr-1 transition-colors duration-100",
        active ? "border-contrast" : "border-rule",
      )}
    >
      <button
        type="button"
        aria-label={`Play ${t.title}`}
        onClick={() => enqueue({ type: "play", index: i })}
        className="flex size-6 shrink-0 items-center justify-center rounded-xs font-mono text-[13px] leading-none text-ash hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
      >
        {active ? <IconPlayerPlay size={14} stroke={1.5} aria-hidden className="text-paper" /> : i + 1}
      </button>
      <TrackName
        key={`${t.id}:${t.title}`}
        title={t.title}
        onRename={(title) => enqueue({ type: "rename", index: i, title })}
      />
      <span className="shrink-0 font-mono text-[13px] leading-none text-ash">{formatTime(t.duration)}</span>
      <IconButton aria-label={`Remove ${t.title}`} onClick={() => enqueue({ type: "remove", index: i })} className="size-7">
        <IconX size={14} stroke={1.5} aria-hidden />
      </IconButton>
    </li>
  )
}

export function TracksSection() {
  const { tracks, current, enqueue } = useAudio()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    list.current?.querySelector("li[data-active]")?.scrollIntoView({ block: "nearest" })
  }, [current])

  const onPick = (files: File[]) => {
    setSkipped(false)
    if (!files.length) return
    enqueue({ type: "add", files })
    const project = useProject.getState()
    if (!project.name.trim()) project.setName(stripExt(files[0].name))
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
          <IconButton aria-label="Add tracks" className="size-7" onClick={() => input.current?.click()}>
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
        // 5 rows of 36px plus 4 gaps of 8px; more than that scrolls
        <ol ref={list} className="flex max-h-53 flex-col gap-2 overflow-y-auto pr-1">
          {tracks.map((t, i) => (
            <Row key={t.id} track={t} index={i} active={i === current} />
          ))}
        </ol>
      )}
      {skipped && !empty && <p className="text-[15px] leading-normal text-paper underline">{SKIPPED}</p>}
    </PanelSection>
  )
}
