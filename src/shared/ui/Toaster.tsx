import { IconX } from "@tabler/icons-react"
import { IconButton } from "./IconButton"
import { useToast } from "../store/useToast"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-sm border border-rule bg-graphite py-2 pl-4 pr-2 text-[15px] leading-[1.3] text-paper animate-[fade-in_120ms_ease-out]"
        >
          {t.message}
          <IconButton aria-label="Dismiss" onClick={() => dismiss(t.id)} className="size-7">
            <IconX size={14} stroke={1.5} aria-hidden />
          </IconButton>
        </div>
      ))}
    </div>
  )
}
