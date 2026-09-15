import {
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconDownload,
  IconHelp,
  IconMoon,
  IconSun,
} from "@tabler/icons-react"
import { Button, IconButton } from "../../../shared/ui"
import { useAudio } from "../../../shared/store/useAudio"
import { useExport } from "../../../shared/store/useExport"
import { useHelp } from "../../../shared/store/useHelp"
import { DEFAULT_NAME, useProject } from "../../../shared/store/useProject"
import { useTheme } from "../../../shared/store/useTheme"

const LINKS = [
  { label: "TikTok", href: "https://www.tiktok.com/@semyelite", Icon: IconBrandTiktok },
  { label: "Instagram", href: "https://www.instagram.com/omo.its.semy", Icon: IconBrandInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/olaleyefisayo/", Icon: IconBrandLinkedin },
  { label: "GitHub", href: "https://github.com/OlaleyeFisayo", Icon: IconBrandGithub },
  { label: "X", href: "https://x.com/semyelite", Icon: IconBrandX },
]

// ponytail: IconButton renders a <button>, so the links borrow its classes rather than
// making it polymorphic for five anchors
const linkClass =
  "inline-flex size-8 items-center justify-center rounded-sm border border-transparent text-ash transition-colors duration-100 hover:border-rule hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"

const exportHint = (canExport: boolean, name: string) => {
  if (!canExport) return "Add audio to export"
  if (!name.trim()) return `Exports as ${DEFAULT_NAME}.mp4`
  return undefined
}

export function Header() {
  const { name, setName } = useProject()
  const { theme, toggle } = useTheme()
  const canExport = useAudio((s) => s.tracks.length > 0)
  const openExport = useExport((s) => s.setOpen)
  const openHelp = useHelp((s) => s.setOpen)
  const ThemeIcon = theme === "dark" ? IconSun : IconMoon

  return (
    <header className="col-span-3 flex h-14 items-center justify-between border-b border-rule bg-ink px-4">
      <div className="flex items-center gap-3">
        <img
          src={theme === "dark" ? "/images/logo.png" : "/images/logo-light.png"}
          alt="winamp-video-maker"
          className="h-10"
        />
        <input
          id="video-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={DEFAULT_NAME}
          className="h-9 w-56 rounded-sm border border-rule bg-graphite px-3 text-[15px] leading-[1.3] text-paper transition-colors duration-100 placeholder:text-ash hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
        />
      </div>
      <div className="flex items-center gap-1">
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
      <div className="flex items-center gap-3">
        <IconButton aria-label="About and keyboard shortcuts" onClick={() => openHelp(true)}>
          <IconHelp size={16} stroke={1.5} aria-hidden />
        </IconButton>
        <IconButton
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggle}
        >
          <ThemeIcon size={16} stroke={1.5} aria-hidden />
        </IconButton>
        <Button
          variant="primary"
          icon={<IconDownload size={16} stroke={1.5} aria-hidden />}
          disabled={!canExport}
          title={exportHint(canExport, name)}
          onClick={() => openExport(true)}
        >
          Export
        </Button>
      </div>
    </header>
  )
}
