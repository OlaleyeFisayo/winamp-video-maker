import { lazy, Suspense } from "react"

const Marketplace = lazy(() =>
 import("../features/marketplace").then((module) => ({ default: module.MarketplacePage })),
)

export default function MarketplaceRoute() {
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