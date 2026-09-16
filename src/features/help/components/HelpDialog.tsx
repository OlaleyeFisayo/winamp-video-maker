import { Dialog } from "../../../shared/ui"
import { useHelp } from "../../../shared/store/useHelp"
import { LINKS, linkClass } from "../../../shared/lib/links"
import { SHORTCUTS } from "../../editor/lib/useShortcuts"

export function HelpDialog() {
  const { open, setOpen } = useHelp()

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="About">
      <section className="flex flex-col gap-2 text-[15px] leading-normal">
        <h3 className="text-paper">winamp-video-maker</h3>
        <p className="text-ash">Turn audio into Winamp-style videos with classic skins, animated visualizers, custom backgrounds, and flexible export settings.</p>
        <p className="text-ash">By Festus-Olaleye Oluwafisayomi Oluwaseunfunmi and Semy Elite.</p>
      </section>
      {/* the header hides its links below md, so they live here instead on small screens */}
      <div className="flex items-center gap-1 md:hidden">
        {LINKS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
            title={label}
            className={linkClass}
          >
            <Icon size={16} stroke={1.5} aria-hidden />
          </a>
        ))}
      </div>
      {/* shortcuts need a keyboard, so they are desktop-only */}
      <section className="hidden flex-col gap-2 md:flex">
        <h3 className="text-[15px] leading-normal text-paper">Keyboard shortcuts</h3>
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
      </section>
    </Dialog>
  )
}
