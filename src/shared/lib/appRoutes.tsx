import type { RouteObject } from "react-router"
import { NotFoundPage } from "../../features/not-found"
import EditorPage from "../../pages/EditorPage"
import MarketplaceRoute from "../../pages/MarketplacePage"
import { ROUTES } from "./routes"

export const appRoutes: RouteObject[] = [
  { path: ROUTES.home, element: <EditorPage /> },
  { path: ROUTES.marketplace, element: <MarketplaceRoute /> },
  { path: "*", element: <NotFoundPage /> },
]
