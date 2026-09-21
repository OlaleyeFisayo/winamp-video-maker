import { Dialog } from "../../../shared/ui"
import { useHelp } from "../../../shared/store/useHelp"
import { LINKS, linkClass } from "../../../shared/lib/links"

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
    </Dialog>
  )
}
