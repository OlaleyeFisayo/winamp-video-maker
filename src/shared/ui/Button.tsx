import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../lib/cn"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "link"
  icon?: ReactNode
}

const variants = {
  primary:
    "bg-contrast text-ink font-bold disabled:bg-graphite disabled:text-ash disabled:cursor-not-allowed",
  ghost: "border border-rule text-paper hover:border-ash",
  link: "text-ash hover:text-paper",
}

export function Button({ variant = "ghost", icon, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-sm px-4 text-[15px] leading-[1.3] transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
