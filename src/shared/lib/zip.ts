/**
 * Minimal zip reader for .wsz skins: walks local file headers and inflates with
 * DecompressionStream, so it works on the main thread and in workers with no dependency.
 */

const SIGNATURE = 0x04034b50

const inflateRaw = async (data: Uint8Array) => {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Reads the named entries (matched on the lower-cased basename) out of a zip archive. */
export const readEntries = async (archive: ArrayBuffer, wanted: string[]) => {
  const want = new Set(wanted.map((n) => n.toLowerCase()))
  const found = new Map<string, Uint8Array>()
  const view = new DataView(archive)
  const bytes = new Uint8Array(archive)
  let offset = 0

  while (offset + 30 <= bytes.length && found.size < want.size) {
    if (view.getUint32(offset, true) !== SIGNATURE) {
      offset++
      continue
    }
    const method = view.getUint16(offset + 8, true)
    const compressed = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const name = new TextDecoder("latin1").decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    const base = name.split("/").pop()!.toLowerCase()
    const start = offset + 30 + nameLength + extraLength

    if (want.has(base) && compressed > 0 && !found.has(base)) {
      const data = bytes.subarray(start, start + compressed)
      found.set(base, method === 8 ? await inflateRaw(data) : data)
    }
    offset = compressed > 0 ? start + compressed : start
  }
  return found
}
