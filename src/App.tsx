import "./shared/store/useTheme"
import { Component, lazy, Suspense, type ReactNode } from "react"
import { Header } from "./features/header"
import { TracksSection } from "./features/audio"
import { TemplateSection } from "./features/templates"
import { FrameSection } from "./features/frame"
import { BackgroundSection, SizeSection } from "./features/canvas"
import { ExportDialog } from "./features/export"
import { HelpDialog } from "./features/help"
import { Button, Panel, Toaster } from "./shared/ui"

const Editor = lazy(() => import("./features/editor").then((module) => ({ default: module.Editor })))

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
  return (
    <>
      <div className="grid h-dvh grid-cols-[280px_1fr_280px] grid-rows-[56px_1fr]">
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
      <ExportDialog />
      <HelpDialog />
      <Toaster />
    </>
  )
}

export default App
