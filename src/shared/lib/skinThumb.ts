/**
 * Pulls the main-window bitmap out of a .wsz so the picker can show real art.
 * Reads the zip's local file headers directly and inflates with DecompressionStream,
 * which avoids shipping a zip library for one file per skin.
 */

const SIGNATURE = 0x04034b50

const inflateRaw = async (data: Uint8Array) => {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Finds `main.bmp` at any depth and returns its bytes, or null when the skin has none. */
export const readMainBitmap = async (archive: ArrayBuffer): Promise<Uint8Array | null> => {
  const view = new DataView(archive)
  const bytes = new Uint8Array(archive)
  let offset = 0

  while (offset + 30 <= bytes.length) {
    if (view.getUint32(offset, true) !== SIGNATURE) {
      offset++
      continue
    }
    const method = view.getUint16(offset + 8, true)
    const compressed = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const name = new TextDecoder("latin1").decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength + extraLength

    if (/(^|\/)main\.bmp$/i.test(name) && compressed > 0) {
      const data = bytes.subarray(start, start + compressed)
      return method === 8 ? await inflateRaw(data) : data
    }
    // a zero compressed size means the sizes live in a trailing descriptor; scan on
    offset = compressed > 0 ? start + compressed : offset + 30 + nameLength + extraLength
  }
  return null
}

/** Object URL for the skin's main window art, or null when it cannot be read. */
export const skinThumbUrl = async (archive: ArrayBuffer): Promise<string | null> => {
  try {
    const bmp = await readMainBitmap(archive)
    if (!bmp || bmp[0] !== 0x42 || bmp[1] !== 0x4d) return null
    return URL.createObjectURL(new Blob([bmp as BlobPart], { type: "image/bmp" }))
  } catch {
    return null
  }
}
