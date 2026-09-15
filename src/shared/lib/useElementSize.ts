import { useEffect, useState, type RefObject } from "react"

/** Live content-box size of an element. Re-observes whenever `active` flips, for elements that mount late. */
export const useElementSize = (ref: RefObject<HTMLElement | null>, active = true) => {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const ro = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, active])
  return size
}
