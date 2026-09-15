export type Selection = { indices: number[]; error?: undefined } | { error: string; indices?: undefined }

/**
 * "1-3, 5" -> [1, 2, 3, 5]. Tokens are numbers or ranges in either order, 1-based,
 * deduplicated and sorted. Errors are sentences the dialog can show as they are.
 */
export const parseSelection = (text: string, count: number): Selection => {
  const tokens = text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return { error: "Type track numbers, like 1-3 or 1,3,5" }

  const picked = new Set<number>()
  for (const token of tokens) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) return { error: "Use numbers, commas and dashes only." }
    const a = Number(m[1])
    const b = m[2] === undefined ? a : Number(m[2])
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    for (let n = lo; n <= hi; n++) {
      if (n < 1 || n > count) {
        return { error: `Track ${n} doesn't exist. You have ${count} ${count === 1 ? "track" : "tracks"}.` }
      }
      picked.add(n)
    }
  }
  return { indices: [...picked].sort((x, y) => x - y) }
}

/** "1, 2, 3 and 5" for the confirmation line. */
export const describeSelection = (indices: number[]) =>
  indices.length <= 1
    ? indices.join("")
    : `${indices.slice(0, -1).join(", ")} and ${indices[indices.length - 1]}`
