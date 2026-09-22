import type { ReactNode } from "react"
import { Link } from "react-router"
import { IconPlus } from "@tabler/icons-react"
import { Eyebrow, PanelSection } from "../../../shared/ui"
import { useTemplate } from "../../../shared/store/useTemplate"
import { useSavedSkins } from "../../../shared/store/useSavedSkins"
import { TEMPLATES } from "../../../shared/lib/templates"
import { cn } from "../../../shared/lib/cn"
import { ROUTES } from "../../../shared/lib/routes"

type Item = { id: string; name: string; thumb?: string }

const tile =
  "grid aspect-275/348 w-full place-items-center overflow-hidden rounded-sm border transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"

function Tile({ item, selected, hint, onPick }: { item: Item; selected: boolean; hint?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      title={hint ? `${item.name} (${hint})` : item.name}
      className={cn(tile, "bg-stage p-px", selected ? "border-contrast" : "border-rule hover:border-ash")}
    >
      {item.thumb ? (
        <img src={item.thumb} alt={item.name} className="h-full w-full object-contain [image-rendering:pixelated]" />
      ) : (
        <span className="font-mono text-[11px] text-ash">—</span>
      )}
    </button>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <div className="grid grid-cols-4 gap-1">{children}</div>
    </div>
  )
}

export function TemplateSection() {
  const { id, thumbs, setId } = useTemplate()
  const saved = useSavedSkins((s) => s.skins)
  const savedThumbs = useSavedSkins((s) => s.thumbs)

  const yours: Item[] = saved.map((s) => ({ id: s.id, name: s.name, thumb: savedThumbs[s.id] }))
  const builtIn: Item[] = TEMPLATES.map((t) => ({ id: t.id, name: t.name, thumb: thumbs[t.id] }))
  const current = yours.find((t) => t.id === id) ?? builtIn.find((t) => t.id === id)
  const source = yours.some((t) => t.id === id) ? "Yours" : "Built in"

  return (
    <PanelSection title="Template" collapsible>
      <div className="flex flex-col gap-3">
        <Group label={`Yours · ${yours.length}`}>
          {/* the way in and the empty state at once: skins picked in the marketplace land here */}
          <Link
            to={ROUTES.marketplace}
            aria-label="Get more skins"
            title="Get more skins"
            className={cn(tile, "border-dashed border-rule text-ash hover:border-ash hover:text-paper")}
          >
            <IconPlus size={16} stroke={1.5} aria-hidden />
          </Link>
          {yours.map((item) => (
            <Tile key={item.id} item={item} selected={item.id === id} onPick={() => setId(item.id)} />
          ))}
        </Group>

        <Group label={`Built in · ${builtIn.length}`}>
          {builtIn.map((item, i) => (
            <Tile
              key={item.id}
              item={item}
              selected={item.id === id}
              hint={i === 0 ? "default" : undefined}
              onPick={() => setId(item.id)}
            />
          ))}
        </Group>

        {current && (
          <p aria-live="polite" className="flex items-baseline justify-between gap-2 text-[13px] leading-[1.3]">
            <span className="truncate text-paper" title={current.name}>
              {current.name}
            </span>
            <span className="shrink-0 font-mono text-ash">{source}</span>
          </p>
        )}
      </div>
    </PanelSection>
  )
}
