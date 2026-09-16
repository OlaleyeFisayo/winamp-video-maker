import { useState } from "react"
import { Link } from "react-router"
import { IconBuildingStore, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { IconButton, PanelSection } from "../../../shared/ui"
import { useTemplate } from "../../../shared/store/useTemplate"
import { useSavedSkins } from "../../../shared/store/useSavedSkins"
import { TEMPLATES } from "../../../shared/lib/templates"
import { cn } from "../../../shared/lib/cn"

export function TemplateSection() {
  const { id, thumbs, setId } = useTemplate()
  const saved = useSavedSkins((s) => s.skins)
  const savedThumbs = useSavedSkins((s) => s.thumbs)

  // saved skins first: they are the ones the user went and got
  const items = [
    ...saved.map((s) => ({ id: s.id, name: s.name, thumb: savedThumbs[s.id] })),
    ...TEMPLATES.map((t) => ({ id: t.id, name: t.name, thumb: thumbs[t.id] })),
  ]

  // the viewed slide is tracked by id, not index: saved skins are prepended and arrive
  // asynchronously, which would otherwise shift the view out from under the user
  const [viewed, setViewed] = useState(id)
  const at = Math.max(0, items.findIndex((t) => t.id === viewed))
  const item = items[at]
  // wraps: last -> first and first -> last, so neither arrow ever dead-ends
  const step = (d: number) => setViewed(items[(at + d + items.length) % items.length].id)

  return (
    <PanelSection
      title="Template"
      collapsible
      action={
        <Link
          to="/marketplace"
          title="Marketplace"
          aria-label="Marketplace"
          className="inline-flex size-9 items-center justify-center rounded-sm border border-transparent text-ash transition-colors duration-100 hover:border-rule hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 md:size-8"
        >
          <IconBuildingStore size={16} stroke={1.5} aria-hidden />
        </Link>
      }
    >
      {item && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Previous template"
              onClick={() => step(-1)}
              className="shrink-0"
            >
              <IconChevronLeft size={16} stroke={1.5} aria-hidden />
            </IconButton>

            <button
              type="button"
              aria-pressed={item.id === id}
              onClick={() => setId(item.id)}
              title={`Use ${item.name}`}
              className={cn(
                "min-w-0 flex-1 rounded-sm border p-1 transition-colors duration-100",
                "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
                item.id === id ? "border-contrast" : "border-rule hover:border-ash",
              )}
            >
              {/* ponytail: same picture box as the marketplace SkinCard, copied not shared —
                  the label/busy/lazy differences made a shared component all props */}
              <span className="grid aspect-275/348 w-full place-items-center overflow-hidden rounded-xs bg-stage">
                {item.thumb ? (
                  <img
                    src={item.thumb}
                    alt=""
                    className="h-full w-full object-contain [image-rendering:pixelated]"
                  />
                ) : (
                  <span className="font-mono text-[11px] text-ash">—</span>
                )}
              </span>
            </button>

            <IconButton
              aria-label="Next template"
              onClick={() => step(1)}
              className="shrink-0"
            >
              <IconChevronRight size={16} stroke={1.5} aria-hidden />
            </IconButton>
          </div>

          <p aria-live="polite" className="flex items-baseline justify-between gap-2 text-[13px] leading-[1.3]">
            <span className="truncate text-paper" title={item.name}>
              {item.name}
            </span>
            <span className="shrink-0 font-mono text-ash">
              {at + 1}/{items.length}
            </span>
          </p>
        </div>
      )}
    </PanelSection>
  )
}
