import { PanelSection } from "../../../shared/ui"
import { useTemplate } from "../../../shared/store/useTemplate"
import { TEMPLATES } from "../../../shared/lib/templates"
import { cn } from "../../../shared/lib/cn"

export function TemplateSection() {
  const { id, thumbs, setId } = useTemplate()

  return (
    <PanelSection title="Template" collapsible>
      <ul className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const selected = t.id === id
          const thumb = thumbs[t.id]
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
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover object-top [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="font-mono text-[11px] text-ash">—</span>
                  )}
                </span>
                <span className="truncate text-[13px] leading-[1.3] text-paper">{t.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </PanelSection>
  )
}
