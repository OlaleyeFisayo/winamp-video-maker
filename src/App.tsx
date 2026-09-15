import "./shared/store/useTheme"
import { Header } from "./features/header"
import { TracksSection } from "./features/audio"
import { Editor } from "./features/editor"
import { FrameSection } from "./features/frame"
import { BackgroundSection, SizeSection } from "./features/canvas"
import { ExportDialog } from "./features/export"
import { HelpDialog } from "./features/help"
import { Panel, Toaster } from "./shared/ui"

function App() {
  return (
    <>
      <div className="grid h-dvh grid-cols-[280px_1fr_280px] grid-rows-[56px_1fr]">
        <Header />
        <Panel side="left">
          <TracksSection />
        </Panel>
        <Editor />
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
