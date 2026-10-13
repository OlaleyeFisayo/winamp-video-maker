import "./shared/store/useTheme"
import { useEffect } from "react"
import { useRoutes } from "react-router"
import { ExportDialog } from "./features/export"
import { HelpDialog } from "./features/help"
import { ResetDialog } from "./features/reset"
import { ShortcutsDialog } from "./features/shortcuts"
import { Toaster } from "./shared/ui"
import { hydrateSavedSkins } from "./shared/store/useSavedSkins"
import { appRoutes } from "./shared/lib/appRoutes"

function App() {
  // saved skins keep their bytes in IndexedDB; their blob URLs are rebuilt once per load
  useEffect(() => {
    void hydrateSavedSkins()
  }, [])

  const routes = useRoutes(appRoutes)

  return (
    <>
      {routes}
      <ExportDialog />
      <HelpDialog />
      <ShortcutsDialog />
      <ResetDialog />
      <Toaster />
    </>
  )
}

export default App
