import type { ThumbRequest, ThumbResponse } from "./skinThumb.worker"
import { getFile, putFile } from "./sessionFiles"

/** IndexedDB key for a skin's cached thumbnail. Kept alongside `skin:<id>` through resets. */
export const thumbKey = (id: string) => `thumb:${id}`

/**
 * Skin thumbnails are unzipped, decoded and painted in a worker: eight of them are built at
 * boot and one per saved skin, and doing that on the main thread was a visible stutter.
 * One worker for the app; requests are matched to replies by id.
 */
let worker: Worker | undefined
let nextId = 0
const waiting = new Map<number, (blob: Blob | null) => void>()

const getWorker = () => {
  if (worker) return worker
  worker = new Worker(new URL("./skinThumb.worker.ts", import.meta.url), { type: "module" })
  worker.onmessage = (e: MessageEvent<ThumbResponse>) => {
    waiting.get(e.data.id)?.(e.data.blob)
    waiting.delete(e.data.id)
  }
  worker.onerror = () => {
    // the worker is gone; every caller gets "no thumbnail" and the next call starts a fresh one
    for (const resolve of waiting.values()) resolve(null)
    waiting.clear()
    worker = undefined
  }
  return worker
}

/** PNG of the skin's main+EQ+playlist windows stacked at 275x348, or null when unreadable. The buffer is transferred. */
export const skinThumbBlob = (archive: ArrayBuffer) =>
  new Promise<Blob | null>((resolve) => {
    const id = nextId++
    waiting.set(id, resolve)
    getWorker().postMessage({ id, archive } satisfies ThumbRequest, [archive])
  })

/**
 * Object URL of the skin's thumbnail, from the cache when it has been built before. A skin's
 * archive never changes, so the PNG is rendered once per skin id and read back on every load
 * after that; `archive` is only called on a miss.
 */
export const skinThumbUrl = async (id: string, archive: () => Promise<ArrayBuffer>): Promise<string | null> => {
  const cached = await getFile(thumbKey(id))
  if (cached?.blob instanceof Blob) return URL.createObjectURL(cached.blob)
  const blob = await skinThumbBlob(await archive())
  if (!blob) return null
  void putFile(thumbKey(id), blob, "thumb.png")
  return URL.createObjectURL(blob)
}
