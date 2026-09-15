import type { HTMLAttributes } from "react"
import { cn } from "../lib/cn"

type Props = HTMLAttributes<HTMLElement> & { side: "left" | "right" }

export function Panel({ side, className, ...rest }: Props) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-6 overflow-y-auto border-rule bg-ink p-4",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
      {...rest}
    />
  )
}
