import type { ButtonHTMLAttributes } from "react"
import { cn } from "../lib/cn"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }

export function IconButton({ className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-sm border border-transparent text-ash transition-colors duration-100 md:size-8",
        "hover:border-rule hover:text-paper",
        "disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
        className,
      )}
      {...rest}
    />
  )
}
