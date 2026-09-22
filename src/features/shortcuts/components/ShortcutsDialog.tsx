import { Dialog } from "../../../shared/ui"
import { useShortcutsDialog } from "../../../shared/store/useShortcutsDialog"
import { LOCAL_SHORTCUTS, SHORTCUTS } from "../../editor/lib/useShortcuts"

const key =
  "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-sm border border-rule bg-graphite px-2 font-mono text-[13px] text-paper"

export function ShortcutsDialog() {
  const { open, setOpen } = useShortcutsDialog()

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <dl className="flex flex-col gap-3">
        {SHORTCUTS.filter((s) => !s.hidden).map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-4">
            <dt className="text-[15px] leading-[1.3] text-paper">{s.label}</dt>
            <dd>
              <kbd className={key}>{s.display ?? s.key}</kbd>
            </dd>
          </div>
        ))}
        {LOCAL_SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-4">
            <dt className="flex flex-col gap-0.5">
              <span className="text-[15px] leading-[1.3] text-paper">{s.label}</span>
              <span className="text-[13px] leading-[1.3] text-ash">{s.hint}</span>
            </dt>
            <dd>
              <kbd className={key}>{s.key}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
