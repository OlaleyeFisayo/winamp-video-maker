import { cn } from "../../../shared/lib/cn"

type Props = {
  name: string
  thumb?: string
  selected?: boolean
  busy?: boolean
  onClick: () => void
}

/** One skin tile. Mirrors the sidebar template card, scaled up for the browse grid. */
export function SkinCard({ name, thumb, selected, busy, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-2 rounded-sm border p-2 text-left transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
        busy && "cursor-wait",
        selected ? "border-contrast" : "border-rule hover:border-ash",
      )}
    >
      <span className="grid aspect-[275/348] w-full place-items-center overflow-hidden rounded-xs bg-stage">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain object-top [image-rendering:pixelated]"
          />
        ) : (
          <span className="font-mono text-[11px] text-ash">—</span>
        )}
      </span>
      <span
        className={cn(
          "truncate text-[15px] leading-[1.3] text-paper",
          selected && "font-bold",
        )}
        title={name}
      >
        {name}
      </span>
    </button>
  )
}
