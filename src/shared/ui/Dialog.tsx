import { useEffect, useId, useRef, type ReactNode } from "react"
import { IconX } from "@tabler/icons-react"
import { IconButton } from "./IconButton"

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Native <dialog>: focus trap, Esc and backdrop come from the browser. */
export function Dialog({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      // `flex` would override the browser's display:none while closed, so it only applies
      // when open. A short landscape viewport must still reach the footer, so the body scrolls.
      className="m-auto max-h-[calc(100dvh-32px)] w-110 max-w-[calc(100vw-32px)] flex-col rounded-md border border-rule bg-graphite p-0 text-paper backdrop:bg-overlay open:flex"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-rule pl-6 pr-3">
        <h2 id={titleId} className="truncate text-[18px] font-bold leading-[1.3]">
          {title}
        </h2>
        <IconButton aria-label="Close" onClick={onClose}>
          <IconX size={16} stroke={1.5} aria-hidden />
        </IconButton>
      </div>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">{children}</div>
      {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-rule p-4">{footer}</div>}
    </dialog>
  )
}
