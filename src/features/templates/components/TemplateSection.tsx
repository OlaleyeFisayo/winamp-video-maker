import { Link } from "react-router"
import { IconBuildingStore } from "@tabler/icons-react"
import { PanelSection } from "../../../shared/ui"
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

  return (
    <PanelSection
      title="Template"
      collapsible
      action={
        <Link
          to="/marketplace"
          title="Marketplace"
          aria-label="Marketplace"
          className="inline-flex size-8 items-center justify-center rounded-sm border border-transparent text-ash transition-colors duration-100 hover:border-rule hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
        >
          <IconBuildingStore size={16} stroke={1.5} aria-hidden />
        </Link>
      }
    >
      <ul className="grid grid-cols-2 gap-2">
        {items.map((t) => {
          const selected = t.id === id
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setId(t.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-sm border p-1 text-left transition-colors duration-100",
                  "focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2",
                  selected ? "border-contrast" : "border-rule hover:border-ash",
                )}
              >
                <span className="grid h-12 place-items-center overflow-hidden rounded-xs bg-stage">
                  {t.thumb ? (
                    <img
                      src={t.thumb}
                      alt=""
                      className="h-full w-full object-cover object-top [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="font-mono text-[11px] text-ash">—</span>
                  )}
                </span>
                <span className="truncate text-[13px] leading-[1.3] text-paper" title={t.name}>
                  {t.name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </PanelSection>
  )
}
