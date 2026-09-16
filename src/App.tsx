import "./shared/store/useTheme"
import { Component, lazy, Suspense, useEffect, type ReactNode } from "react"
import { useLocation } from "react-router"
import { Header } from "./features/header"
import { TracksSection } from "./features/audio"
import { TemplateSection } from "./features/templates"
import { FrameSection } from "./features/frame"
import { BackgroundSection, SizeSection } from "./features/canvas"
import { ExportDialog } from "./features/export"
import { HelpDialog } from "./features/help"
import { Button, Panel, Toaster } from "./shared/ui"
import { cn } from "./shared/lib/cn"
import { hydrateSavedSkins } from "./shared/store/useSavedSkins"

const Editor = lazy(() => import("./features/editor").then((module) => ({ default: module.Editor })))
const Marketplace = lazy(() =>
  import("./features/marketplace").then((module) => ({ default: module.MarketplacePage })),
)

class EditorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="grid place-content-center gap-4 bg-graphite p-8 text-ash">
          <p role="alert">The editor couldn't load. Check your connection and reload.</p>
          <Button onClick={() => window.location.reload()}>Reload editor</Button>
        </section>
      )
    }
    return this.props.children
  }
}

function App() {
  const marketplace = useLocation().pathname === "/marketplace"

  // saved skins keep their bytes in IndexedDB; their blob URLs are rebuilt once per load
  useEffect(() => {
    void hydrateSavedSkins()
  }, [])

  return (
    <>
      {/* ponytail: webamp cannot be disposed or remounted, so the editor is hidden, never unmounted */}
      <div
        className={cn(
          "grid h-dvh grid-cols-[280px_1fr_280px] grid-rows-[56px_1fr]",
          marketplace && "hidden",
        )}
      >
        <Header />
        <Panel side="left">
          <TemplateSection />
          <TracksSection />
        </Panel>
        <EditorBoundary>
          <Suspense fallback={<section role="status" className="grid place-items-center bg-graphite p-8 text-ash">Loading editor…</section>}>
            <Editor />
          </Suspense>
        </EditorBoundary>
        <Panel side="right">
          <FrameSection />
          <SizeSection />
          <BackgroundSection />
        </Panel>
      </div>
      {marketplace && (
        <Suspense
          fallback={
            <div role="status" className="grid h-dvh place-items-center bg-ink text-ash">
              Loading marketplace…
            </div>
          }
        >
          <Marketplace />
        </Suspense>
      )}
      <ExportDialog />
      <HelpDialog />
      <Toaster />
    </>
  )
}

export default App
