import type { ReactNode } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { Eyebrow } from "./Eyebrow"

type Props = { title: string; action?: ReactNode; collapsible?: boolean; children: ReactNode }

const divider = "flex flex-col gap-2 [&+&]:border-t [&+&]:border-rule [&+&]:pt-6"

export function PanelSection({ title, action, collapsible, children }: Props) {
  if (!collapsible) {
    return (
      <section className={divider}>
        <div className="flex h-8 items-center justify-between">
          <Eyebrow>{title}</Eyebrow>
          {action}
        </div>
        {children}
      </section>
    )
  }
  return (
    <details open className={`group ${divider}`}>
      <summary className="flex h-8 cursor-pointer list-none items-center justify-between rounded-sm focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Eyebrow>{title}</Eyebrow>
          <IconChevronDown
            size={16}
            stroke={1.5}
            aria-hidden
            className="text-ash transition-transform duration-100 group-open:rotate-180"
          />
        </span>
        {action && <span onClick={(e) => e.preventDefault()}>{action}</span>}
      </summary>
      {children}
    </details>
  )
}
