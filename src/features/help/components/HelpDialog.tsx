import { Dialog } from "../../../shared/ui"
import { useHelp } from "../../../shared/store/useHelp"
import { SHORTCUTS } from "../../editor/lib/useShortcuts"

export function HelpDialog() {
  const { open, setOpen } = useHelp()

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <dl className="flex flex-col gap-3">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <dt className="text-[15px] leading-[1.3] text-paper">{s.label}</dt>
            <dd>
              <kbd className="inline-flex size-7 items-center justify-center rounded-sm border border-rule bg-graphite font-mono text-[13px] text-paper">
                {s.key}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
