import { Link, useLocation } from "react-router"
import { Button, Eyebrow } from "../../../shared/ui"
import { ROUTES } from "../../../shared/lib/routes"

export function NotFoundPage() {
  const { pathname } = useLocation()
  // the skin's track-title display, reading the missing page as a track that never loaded
  const title = `1. ${pathname} — not found (0:00)`

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-8">
      <div className="flex w-full min-w-0 max-w-md flex-col items-start gap-4">
        <Eyebrow>Not found</Eyebrow>
        <div
          aria-label={title}
          className="w-full overflow-hidden rounded-sm border border-rule bg-graphite px-3 py-2 font-mono text-[15px] leading-[1.3] whitespace-nowrap text-paper"
        >
          {/* the text twice, so the loop hands off without a gap, like the skin's marquee */}
          <span aria-hidden className="marquee inline-block">
            {title}
            <span className="inline-block w-12" />
            {title}
            <span className="inline-block w-12" />
          </span>
        </div>
        <p className="text-[15px] leading-normal text-ash">There's no page here.</p>
        <Link to={ROUTES.home} className="rounded-sm focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2">
          <Button variant="primary" tabIndex={-1}>
            Back to the editor
          </Button>
        </Link>
      </div>
    </main>
  )
}
