/**
 * The persisted playlist: which stored file each row came from, in playlist order.
 * Webamp owns the real playlist, so the manifest is derived from the mirror in useAudio
 * rather than from each add/remove/rename command.
 */

import { key } from "./storageKeys"

export type ManifestEntry = { id: string; title: string; selected?: boolean; trim?: number }

/** A playlist row, narrowed to what the manifest needs. */
type Row = { url: string; title: string; trim?: number | null }

export const MANIFEST_KEY = key("playlist")

/**
 * Rebuilds the manifest from the current playlist. `ids` maps a row's blob URL to the
 * stored file it was appended from; rows with no mapping are dropped, since without bytes
 * on disk there is nothing to restore.
 */
export const buildManifest = (rows: Row[], ids: Map<string, { id: string }>, selectedUrl?: string): ManifestEntry[] => {
  const out: ManifestEntry[] = []
  for (const row of rows) {
    const id = ids.get(row.url)?.id
    if (id)
      out.push({
        id,
        title: row.title,
        ...(row.url === selectedUrl ? { selected: true } : {}),
        ...(typeof row.trim === "number" ? { trim: row.trim } : {}),
      })
  }
  return out
}

export const readManifest = (): ManifestEntry[] => {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is ManifestEntry =>
          !!e && typeof (e as ManifestEntry).id === "string" && typeof (e as ManifestEntry).title === "string",
      )
      .map(({ trim, ...rest }) =>
        // a trim from a tampered or older manifest must not poison the timeline arithmetic
        typeof trim === "number" && Number.isFinite(trim) && trim > 0 ? { ...rest, trim } : rest,
      )
  } catch {
    return []
  }
}

export const writeManifest = (entries: ManifestEntry[]) => {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(entries))
  } catch {
    // a full or blocked localStorage costs the restore, not the session
  }
}
