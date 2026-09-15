import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { cn } from "../lib/cn"
import { acceptsFile } from "../lib/acceptsFile"

type Props = {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  onReject: () => void
  icon?: ReactNode
  children: ReactNode
  error?: string
}


export function Dropzone({ accept, multiple, onFiles, onReject, icon, children, error }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (list: FileList | null | undefined) => {
    const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
    const ok = files.filter((f) => acceptsFile(f, accept))
    if (ok.length) onFiles(ok)
    if (ok.length < files.length) onReject()
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files)
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-sm border border-dashed bg-graphite p-6 text-center text-[15px] leading-normal text-paper transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
        error ? "border-paper" : over ? "border-ash" : "border-rule hover:border-ash",
      )}
    >
      <span className="text-ash">{icon}</span>
      <span>{children}</span>
      <span className="text-ash hover:text-paper">Browse files</span>
      {error && <span className="underline">{error}</span>}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ""
        }}
      />
    </button>
  )
}
