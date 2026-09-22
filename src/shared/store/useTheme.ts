import { create } from "zustand"
import { key } from "../lib/storageKeys"
import { persist } from "zustand/middleware"

type Theme = "dark" | "light"

type ThemeStore = {
  theme: Theme
  toggle: () => void
}

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: systemTheme(),
      toggle: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: key("theme") },
  ),
)

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}
apply(useTheme.getState().theme)
useTheme.subscribe((s, p) => {
  if (s.theme !== p.theme) apply(s.theme)
})
