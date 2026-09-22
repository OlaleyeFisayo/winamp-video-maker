import { IconDownload, IconHelp, IconKeyboard, IconMoon, IconRefresh, IconSun } from "@tabler/icons-react"
import { Button, IconButton } from "../../../shared/ui"
import { LINKS, linkClass } from "../../../shared/lib/links"
import { useAudio } from "../../../shared/store/useAudio"
import { useExport } from "../../../shared/store/useExport"
import { useHelp } from "../../../shared/store/useHelp"
import { useShortcutsDialog } from "../../../shared/store/useShortcutsDialog"
import { useReset } from "../../../shared/store/useReset"
import { DEFAULT_NAME, useProject } from "../../../shared/store/useProject"
import { useTheme } from "../../../shared/store/useTheme"

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
  const openShortcuts = useShortcutsDialog((s) => s.setOpen)
  const openReset = useReset((s) => s.setOpen)
  const ThemeIcon = theme === "dark" ? IconSun : IconMoon
  // one string for the tooltip and the accessible name, so they cannot drift apart
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-rule bg-ink px-4 md:col-span-3">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
        <img
          src={theme === "dark" ? "/images/logo.png" : "/images/logo-light.png"}
          alt="winamp-video-maker"
          className="h-10 shrink-0"
        />
        <input
          id="video-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={DEFAULT_NAME}
          className="h-9 w-full min-w-0 rounded-sm border border-rule md:w-56 bg-graphite px-3 text-[15px] leading-[1.3] text-paper transition-colors duration-100 placeholder:text-ash hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
        />
      </div>
      {/* the profiles carry these links too, so they are the first thing to go when narrow */}
      <div className="hidden items-center gap-1 md:flex">
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
      <div className="flex shrink-0 items-center gap-1 md:gap-3">
        <IconButton aria-label="Start over" title="Start over" onClick={() => openReset(true)}>
          <IconRefresh size={16} stroke={1.5} aria-hidden />
        </IconButton>
        {/* shortcuts need a keyboard, so the button stays off touch layouts. The wrapper does the
            hiding: IconButton's own inline-flex would otherwise win over a `hidden` passed to it */}
        <span className="hidden md:contents">
          <IconButton
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            onClick={() => openShortcuts(true)}
          >
            <IconKeyboard size={16} stroke={1.5} aria-hidden />
          </IconButton>
        </span>
        <IconButton aria-label="About" title="About" onClick={() => openHelp(true)}>
          <IconHelp size={16} stroke={1.5} aria-hidden />
        </IconButton>
        <IconButton aria-label={themeLabel} title={themeLabel} onClick={toggle}>
          <ThemeIcon size={16} stroke={1.5} aria-hidden />
        </IconButton>
        <Button
          variant="primary"
          aria-label="Export"
          icon={<IconDownload size={16} stroke={1.5} aria-hidden />}
          disabled={!canExport}
          title={exportHint(canExport, name)}
          onClick={() => openExport(true)}
          className="px-3 md:px-4"
        >
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </header>
  )
}
