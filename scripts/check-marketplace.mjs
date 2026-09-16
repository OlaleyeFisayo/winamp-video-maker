/**
 * Smallest thing that fails if the marketplace breaks: the museum API contract.
 *
 * The app has no test framework, so this is a plain assert script — run it with
 * `pnpm check:marketplace`. It hits the live API, so it needs network. If the museum
 * ever renames a field or drops offset paging, this fails loudly instead of the grid
 * silently rendering empty.
 */
import assert from "node:assert/strict"

const API = "https://api.webamp.org/graphql"
const PAGE = 48
const FIELDS = "md5 filename ... on ClassicSkin { screenshot_url download_url }"

const query = async (body) => {
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: body }),
  })
  assert.ok(response.ok, `API returned ${response.status}`)
  const json = await response.json()
  assert.ok(!json.errors, `API error: ${json.errors?.[0]?.message}`)
  return json.data
}

const toSkin = (n) =>
  n.screenshot_url && n.download_url
    ? {
        md5: n.md5,
        name: n.filename.replace(/\.(wsz|zip)$/i, ""),
        screenshotUrl: n.screenshot_url,
        downloadUrl: n.download_url,
      }
    : null

const page = async (offset) =>
  (await query(`{ skins(first:${PAGE}, offset:${offset}) { nodes { ${FIELDS} } } }`)).skins.nodes
    .map(toSkin)
    .filter((s) => s !== null)

const first = await page(0)
assert.ok(first.length > 0, "first page is empty")

// paging must advance: identical pages would make infinite scroll repeat forever
const second = await page(first.length)
const overlap = first.filter((a) => second.some((b) => b.md5 === a.md5))
assert.equal(overlap.length, 0, "offset paging returned overlapping skins")

assert.doesNotMatch(first[0].name, /\.(wsz|zip)$/i, "extension not stripped from name")

const hits = (await query(`{ search_skins(query:"matrix", first:${PAGE}) { ${FIELDS} } }`)).search_skins
  .map(toSkin)
  .filter((s) => s !== null)
assert.ok(hits.length > 0, "search returned nothing for a term that has matches")

// the archive must survive the same gate adoptSkin applies before saving a skin
const blob = await (await fetch(hits[0].downloadUrl)).arrayBuffer()
const bytes = new Uint8Array(blob)
assert.ok(bytes[0] === 0x50 && bytes[1] === 0x4b, "download is not a zip")
assert.ok(Buffer.from(bytes).includes(Buffer.from("main.bmp")), "archive has no main.bmp")

console.log(`ok — ${first.length} browsed, ${hits.length} searched, ${bytes.length} bytes downloaded`)
