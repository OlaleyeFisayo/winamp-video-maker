/**
 * The Winamp Skin Museum's public GraphQL API — ~100,000 classic skins.
 *
 * Plain fetch, no GraphQL client: three queries and one response shape do not need one.
 * Caching and paging live in TanStack Query at the call site, so these stay plain promises.
 *
 * The API reflects the request origin in Access-Control-Allow-Origin and the CDN serves the
 * archives with `*`, so this all works straight from the browser with no backend.
 */

const API = "https://api.webamp.org/graphql"

export type MuseumSkin = {
  md5: string
  name: string
  screenshotUrl: string
  downloadUrl: string
}

/** The API returns non-classic skins too; those have no screenshot or download fields. */
type Node = {
  md5: string
  filename: string
  screenshot_url?: string | null
  download_url?: string | null
}

const FIELDS = "md5 filename ... on ClassicSkin { screenshot_url download_url }"

const toSkin = (n: Node): MuseumSkin | null =>
  n.screenshot_url && n.download_url
    ? {
        md5: n.md5,
        name: n.filename.replace(/\.(wsz|zip)$/i, ""),
        screenshotUrl: n.screenshot_url,
        downloadUrl: n.download_url,
      }
    : null

/**
 * `signal` comes from TanStack Query, which aborts it when a query is superseded or its
 * component unmounts — so typing a new search word cancels the request still in flight
 * rather than leaving it to finish and be thrown away.
 */
const query = async <Data, T>(body: string, pick: (data: Data) => T, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: body }),
    signal,
  })
  if (!response.ok) throw new Error(String(response.status))
  const json = await response.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? "query failed")
  return pick(json.data)
}

export const PAGE = 48

/** One page of the full catalogue, newest-first as the museum orders it. */
export const listSkins = (offset: number, signal?: AbortSignal) =>
  query(
    `{ skins(first:${PAGE}, offset:${offset}) { nodes { ${FIELDS} } } }`,
    (d: { skins: { nodes: Node[] } }) => d.skins.nodes.map(toSkin).filter((s) => s !== null),
    signal,
  )

/** Total number of skins, for the browse header. */
export const countSkins = (signal?: AbortSignal) =>
  query(`{ skins { count } }`, (d: { skins: { count: number } }) => d.skins.count, signal)

/**
 * ponytail: search returns one bare list with no paging — the API takes no offset here,
 * so results are capped at `first`. Add paging if the API grows it.
 */
export const searchSkins = (term: string, signal?: AbortSignal) =>
  query(
    `{ search_skins(query:${JSON.stringify(term)}, first:${PAGE}) { ${FIELDS} } }`,
    (d: { search_skins: Node[] }) => d.search_skins.map(toSkin).filter((s) => s !== null),
    signal,
  )
