import { IconX } from "@tabler/icons-react"
import { IconButton } from "./IconButton"
import { useToast } from "../store/useToast"

const card =
  "pointer-events-auto rounded-sm border border-rule bg-graphite text-[15px] leading-[1.3] text-paper animate-[fade-in_120ms_ease-out]"

export function Toaster() {
  const { toasts, progress, dismiss } = useToast()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-6 z-50 flex flex-col items-center gap-2"
    >
      {progress && (
        <div className={`${card} w-72 max-w-[calc(100vw-32px)] px-4 py-3`}>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">{progress.label}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[13px] text-ash">{Math.round(progress.percent)}%</span>
              {progress.onCancel && (
                <button
                  type="button"
                  onClick={progress.onCancel}
                  className="text-[13px] leading-none text-ash underline-offset-2 hover:text-paper hover:underline focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
                >
                  Cancel
                </button>
              )}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={progress.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.percent)}
            className="mt-2 h-0.5 w-full bg-rule"
          >
            <div
              className="h-full bg-contrast transition-[width] duration-100"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
      {toasts.map((t) => (
        <div key={t.id} className={`${card} flex max-w-[calc(100vw-32px)] items-center gap-2 py-2 pl-4 pr-2`}>
          {t.message}
          <IconButton aria-label="Dismiss" onClick={() => dismiss(t.id)} className="size-9 md:size-7">
            <IconX size={14} stroke={1.5} aria-hidden />
          </IconButton>
        </div>
      ))}
    </div>
  )
}
