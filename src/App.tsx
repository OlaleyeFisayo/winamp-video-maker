import "./shared/store/useTheme"
import { Component, lazy, Suspense, useEffect, type ReactNode } from "react"
import { Route, Routes } from "react-router"
import { Header } from "./features/header"
import { TracksSection } from "./features/audio"
import { TemplateSection } from "./features/templates"
import { FrameSection } from "./features/frame"
import { BackgroundSection, SizeSection } from "./features/canvas"
import { ExportDialog } from "./features/export"
import { HelpDialog } from "./features/help"
import { ResetDialog } from "./features/reset"
import { ShortcutsDialog } from "./features/shortcuts"
import { NotFoundPage } from "./features/not-found"
import { Button, Panel, Toaster } from "./shared/ui"
import { cn } from "./shared/lib/cn"
import { hydrateSavedSkins } from "./shared/store/useSavedSkins"
import { ROUTES } from "./shared/lib/routes"

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

function EditorPage() {
  return (
    <div
      className={cn(
        // stacked below md: the editor keeps a usable height and the panels flow beneath it
        "flex h-dvh flex-col overflow-y-auto",
        "md:grid md:grid-cols-[240px_1fr_240px] md:grid-rows-[56px_1fr] md:overflow-hidden",
        "lg:grid-cols-[280px_1fr_280px]",
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
  )
}

function MarketplaceRoute() {
  return (
    <Suspense
      fallback={
        <div role="status" className="grid h-dvh place-items-center bg-ink text-ash">
          Loading marketplace…
        </div>
      }
    >
      <Marketplace />
    </Suspense>
  )
}

function App() {
  // saved skins keep their bytes in IndexedDB; their blob URLs are rebuilt once per load
  useEffect(() => {
    void hydrateSavedSkins()
  }, [])

  return (
    <>
      <Routes>
        <Route path={ROUTES.home} element={<EditorPage />} />
        <Route path={ROUTES.marketplace} element={<MarketplaceRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ExportDialog />
      <HelpDialog />
      <ShortcutsDialog />
      <ResetDialog />
      <Toaster />
    </>
  )
}

export default App
