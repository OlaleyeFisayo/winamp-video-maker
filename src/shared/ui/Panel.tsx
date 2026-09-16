import type { HTMLAttributes } from "react"
import { cn } from "../lib/cn"

type Props = HTMLAttributes<HTMLElement> & { side: "left" | "right" }

export function Panel({ side, className, ...rest }: Props) {
  return (
    <aside
      className={cn(
        // stacked on mobile the panel scrolls with the page and divides with a top rule
        "flex flex-col gap-6 border-t border-rule bg-ink p-4 md:border-t-0 md:overflow-y-auto",
        side === "left" ? "md:border-r" : "md:border-l",
        className,
      )}
      {...rest}
    />
  )
}
