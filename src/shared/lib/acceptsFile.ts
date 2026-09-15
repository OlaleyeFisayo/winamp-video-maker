/** Mirrors the browser accept attribute: ".ext", "type/*" or "type/sub". */
export const acceptsFile = (file: File, accept: string) =>
  accept.split(",").some((a) => {
    const t = a.trim()
    if (t.startsWith(".")) return file.name.toLowerCase().endsWith(t.toLowerCase())
    if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -1))
    return file.type === t
  })
