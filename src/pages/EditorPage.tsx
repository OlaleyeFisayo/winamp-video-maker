import { lazy, Suspense } from "react";
import { TracksSection } from "../features/audio";
import { Header } from "../features/header";
import { TemplateSection } from "../features/templates";
import { cn } from "../shared/lib/cn";
import { Panel } from "../shared/ui";
import { FrameSection } from "../features/frame";
import { BackgroundSection, SizeSection } from "../features/canvas";
import EditorBoundary from "../features/editor/components/EditorBoundary";

const Editor = lazy(() => import("../features/editor").then((module) => ({ default: module.Editor })))

export default function EditorPage() {
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
   <main className="contents">
    <EditorBoundary>
     <Suspense fallback={<section role="status" className="grid place-items-center bg-graphite p-8 text-ash">Loading editor…</section>}>
      <Editor />
     </Suspense>
    </EditorBoundary>
   </main>
   <Panel side="right">
    <FrameSection />
    <SizeSection />
    <BackgroundSection />
   </Panel>
  </div>
 )
}