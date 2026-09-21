/** Every page in the app. Paths live here so links and routes can't drift apart. */
export const ROUTES = {
  home: "/",
  marketplace: "/marketplace",
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
