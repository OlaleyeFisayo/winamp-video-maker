import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { IconArrowLeft, IconTrash, IconUpload } from "@tabler/icons-react"
import { Button, Dropzone, Eyebrow, IconButton } from "../../../shared/ui"
import { useTemplate } from "../../../shared/store/useTemplate"
import { removeSavedSkin, useSavedSkins } from "../../../shared/store/useSavedSkins"
import { countSkins, listSkins, PAGE, searchSkins } from "../lib/museum"
import { adoptMuseumSkin, adoptUploadedSkin } from "../lib/adoptSkin"
import { SkinCard } from "./SkinCard"

const REJECT = "That file isn't a .wsz skin."

export function MarketplacePage() {
  const navigate = useNavigate()
  const currentId = useTemplate((s) => s.id)
  const saved = useSavedSkins((s) => s.skins)
  const thumbs = useSavedSkins((s) => s.thumbs)

  const [term, setTerm] = useState("")
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejected, setRejected] = useState(false)

  // the search box drives the query; typing should not fire a request per keystroke
  useEffect(() => {
    const id = setTimeout(() => setQuery(term.trim()), 300)
    return () => clearTimeout(id)
  }, [term])

  const { data: total } = useQuery({
    queryKey: ["skins", "count"],
    queryFn: ({ signal }) => countSkins(signal),
  })

  const browse = useInfiniteQuery({
    queryKey: ["skins", "browse"],
    queryFn: ({ pageParam, signal }) => listSkins(pageParam, signal),
    initialPageParam: 0,
    // the offset is how many skins we already hold, not pages × PAGE: listSkins drops
    // non-classic entries, so a page can return fewer than it asked for
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.flat().length),
    enabled: !query,
  })

  // search returns one un-paged list, so it is a plain query rather than an infinite one.
  // The key holds the term, so typing a new word aborts the previous request mid-flight.
  const search = useQuery({
    queryKey: ["skins", "search", query],
    queryFn: ({ signal }) => searchSkins(query, signal),
    enabled: Boolean(query),
  })

  const skins = query ? (search.data ?? []) : (browse.data?.pages.flat() ?? [])
  const loading = query ? search.isPending : browse.isPending || browse.isFetchingNextPage
  const failed = query ? search.isError : browse.isError

  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    // infinite scroll is browse-only; search has nothing more to fetch
    if (!el || query || !browse.hasNextPage || browse.isFetchingNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) void browse.fetchNextPage()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [query, browse.hasNextPage, browse.isFetchingNextPage, browse.fetchNextPage, browse])

  const pick = async (id: string, run: () => Promise<boolean>) => {
    setBusy(id)
    const ok = await run()
    setBusy(null)
    if (ok) void navigate("/")
  }

  return (
    <div className="flex h-dvh flex-col bg-ink">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-rule px-4">
        <Button variant="link" icon={<IconArrowLeft size={16} stroke={1.5} aria-hidden />} onClick={() => void navigate("/")} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search skins"
          aria-label="Search skins"
          className="h-9 w-72 rounded-sm border border-rule bg-graphite px-3 text-[15px] leading-[1.3] text-paper transition-colors duration-100 placeholder:text-ash hover:border-ash focus:border-paper focus:outline-none focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2"
        />
        {total !== undefined && (
          <span className="font-mono text-[13px] leading-[1.3] text-ash">
            {total.toLocaleString()} skins
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <section className="flex flex-col gap-2">
          <div className="flex h-8 items-center">
            <Eyebrow>My skins</Eyebrow>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            <Dropzone
              accept=".wsz"
              onFiles={(files) => {
                setRejected(false)
                void pick("upload", () => adoptUploadedSkin(files[0]))
              }}
              onReject={() => setRejected(true)}
              error={rejected ? REJECT : undefined}
              icon={<IconUpload size={16} stroke={1.5} aria-hidden />}
            >
              Drop a .wsz skin.
            </Dropzone>
            {saved.map((skin) => (
              <div key={skin.id} className="relative">
                <SkinCard
                  name={skin.name}
                  thumb={thumbs[skin.id]}
                  selected={skin.id === currentId}
                  busy={busy === skin.id}
                  onClick={() => {
                    useTemplate.getState().setId(skin.id)
                    void navigate("/")
                  }}
                />
                <IconButton
                  aria-label={`Remove ${skin.name}`}
                  title="Remove"
                  className="absolute top-3 right-3 bg-ink/80"
                  onClick={() => void removeSavedSkin(skin.id)}
                >
                  <IconTrash size={14} stroke={1.5} aria-hidden />
                </IconButton>
              </div>
            ))}
          </div>
          {!saved.length && (
            <p className="text-[15px] leading-normal text-ash">
              Skins you use from the museum are saved here.
            </p>
          )}
        </section>

        <section className="mt-6 flex flex-col gap-2 border-t border-rule pt-6">
          <div className="flex h-8 items-center">
            <Eyebrow>{query ? "Results" : "Skin museum"}</Eyebrow>
          </div>

          {failed && !skins.length ? (
            <p className="text-[15px] leading-normal text-ash">
              The skin museum couldn't be reached. Check your connection and try again.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {skins.map((skin) => (
                  <SkinCard
                    key={skin.md5}
                    name={skin.name}
                    thumb={skin.screenshotUrl}
                    selected={`saved:${skin.md5}` === currentId}
                    busy={busy === skin.md5}
                    onClick={() => void pick(skin.md5, () => adoptMuseumSkin(skin))}
                  />
                ))}
              </div>
              {!loading && !skins.length && query && (
                <p className="text-[15px] leading-normal text-ash">Nothing matched “{query}”.</p>
              )}
              {loading && (
                <p role="status" className="py-6 text-center text-[15px] leading-normal text-ash">
                  Loading skins…
                </p>
              )}
              <div ref={sentinel} aria-hidden className="h-px" />
            </>
          )}
        </section>
      </div>

      <p className="shrink-0 border-t border-rule px-6 py-3 text-[15px] leading-normal text-ash">
        Skins from the{" "}
        <Link to="https://skins.webamp.org" target="_blank" rel="noreferrer noopener" className="underline hover:text-paper">
          Winamp Skin Museum
        </Link>
        .
      </p>
    </div>
  )
}
