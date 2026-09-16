/**
 * The bytes behind a restored session: audio tracks and the background image.
 * Everything else about a session is plain JSON in localStorage; only files live here.
 *
 * ponytail: raw IndexedDB, no wrapper dependency. Every call fails soft — a private window
 * or blocked storage costs the restore, never the app.
 */

const DB = "winamp-video-maker-session"
const STORE = "files"

export type StoredFile = { blob: Blob; name: string }

let open: Promise<IDBDatabase | null> | undefined

const db = () =>
  (open ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  }))

/** Runs `body` against the store and resolves with its result, or `fallback` if anything fails. */
const run = async <T,>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest,
  fallback: T,
): Promise<T> => {
  const handle = await db()
  if (!handle) return fallback
  return new Promise<T>((resolve) => {
    try {
      const tx = handle.transaction(STORE, mode)
      const request = body(tx.objectStore(STORE))
      // A successful request can still belong to a transaction that fails to commit.
      tx.oncomplete = () => resolve(request.result as T)
      request.onerror = () => resolve(fallback)
      tx.onabort = () => resolve(fallback)
    } catch {
      resolve(fallback)
    }
  })
}

export const putFile = (id: string, file: File | Blob, name?: string) =>
  run<unknown>(
    "readwrite",
    (s) => s.put({ blob: file, name: name ?? (file as File).name ?? "" } satisfies StoredFile, id),
    null,
  )

export const getFile = (id: string) =>
  run<StoredFile | undefined>("readonly", (s) => s.get(id), undefined)

export const deleteFile = (id: string) => run<unknown>("readwrite", (s) => s.delete(id), null)

/** Every stored id starting with `prefix`. Used to keep saved skins out of the prune below. */
export const listKeys = (prefix: string) =>
  run<IDBValidKey[]>("readonly", (s) => s.getAllKeys(), []).then((keys) =>
    keys.filter((k): k is string => typeof k === "string" && k.startsWith(prefix)),
  )

/** Drops every record whose id is not in `keep`, so removed tracks stop costing disk. */
export const clearExcept = (keep: string[]) =>
  run<unknown>("readwrite", (s) => {
    const live = new Set(keep)
    const request = s.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (typeof cursor.key === "string" && !live.has(cursor.key)) cursor.delete()
      cursor.continue()
    }
    return request
  }, null)
