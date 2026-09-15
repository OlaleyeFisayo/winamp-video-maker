import type { HTMLAttributes } from "react"
import { cn } from "../lib/cn"

export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-mono text-[11px] uppercase tracking-[0.08em] text-ash", className)}
      {...rest}
    />
  )
}
