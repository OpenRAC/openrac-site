import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { GithubIcon } from "@/components/ui/icons";
import Boundary from "@/components/ui/Boundary";
import Markdown from "@/components/ui/Markdown";
import AddToSet from "@/components/mods/AddToSet";
import { TrustBadge, WorksBadge } from "@/components/mods/Badges";
import ModsShell, { Count, SideGroup, sideItem } from "@/components/mods/ModsShell";
import InstallBar from "@/components/mods/InstallBar";
import InstallButton from "@/components/mods/InstallButton";
import MediaGallery, { type GalleryItem } from "@/components/mods/MediaGallery";
import ModImage from "@/components/mods/ModImage";
import { formatSize } from "@/lib/format";
import { ldJson, modLd, siteUrl } from "@/lib/machine";
import Image from "next/image";
import { getMod, getMods } from "@/lib/mods";
import { withDetails } from "@/lib/mods/details";
import { getDiscussion } from "@/lib/mods/discussion";
import { CONTENT_RULES } from "@/lib/mods/links";
import {
  DISC_LABEL,
  GAME_LABEL,
  IMPACT_LABEL,
  PLATFORM_LABEL,
  TRUST_LABEL,
  ago,
  renderedAt,
  apiFits,
  dependents,
  formatCount,
  isRevoked,
  isWithdrawn,
  latest,
  mediaSrc,
  repoLinks,
  reportUrl,
  widthFor,
  worksWith,
  gameOf,
} from "@/lib/mods/logic";
import { slim, slimImageOf, thumbDataUrl, type SlimMod } from "@/lib/mods/slim";
import type { ListedMod } from "@/lib/mods/types";

// Each mod's page is static and rebuilt in the background with the list; a mod listed after the build is rendered on its first visit.
export const revalidate = 300;

export async function generateStaticParams() {
  // An unreachable index gives no pages here, never a failed build: they render on demand instead.
  return (await getMods()).map((m) => ({ id: m.id }));
}

const gameName = (m: ListedMod) => GAME_LABEL[Object.keys(m.games)[0]] ?? "Ratchet & Clank";
const shortGame = (m: ListedMod) => (Object.keys(m.games)[0] ?? "rac1").toUpperCase().replace("RAC", "R&C");

export async function generateMetadata(props: PageProps<"/mods/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { mod, catalog } = await getMod(id);
  if (!mod) return { title: "Mod not found", robots: { index: false } };
  // A mod taken off the list keeps its page (old links still explain why) but leaves search results.
  const withdrawn = isWithdrawn(catalog.revoked, mod.id);
  const title = `${mod.name} · ${shortGame(mod)} mod`;
  const description = mod.description.length > 155 ? `${mod.description.slice(0, 152).trimEnd()}…` : mod.description;
  return {
    title,
    description,
    alternates: { canonical: `/mods/${mod.id}` },
    ...(withdrawn && { robots: { index: false, follow: true } }),
    openGraph: { title: `${title} · OpenRAC`, description, url: `/mods/${mod.id}`, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description },
  };
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mb-3 text-[18px] font-semibold text-hi">{children}</h2>;
const SUB = "mb-2 text-[13px] font-semibold text-dim";

/** A small linked card for a related mod. */
function RelationCard({ m, note }: { m: SlimMod; note?: string }) {
  return (
    <li>
      <Link href={`/mods/${m.id}`} className="d-card d-card-link flex items-center gap-3 p-2.5 pr-4 no-underline">
        {m.card ? <ModImage img={m.card} sizes="80px" className="aspect-video w-20 flex-none rounded-lg object-cover" /> : <span aria-hidden className="aspect-video w-20 flex-none rounded-lg bg-gradient-to-br from-panel-hi to-ink" />}
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-hi [overflow-wrap:anywhere]">{m.name}</span>
          <span className="block text-[13px] text-dim">{note ?? `by ${m.author}`}</span>
        </span>
      </Link>
    </li>
  );
}

function Relations({ title, items, empty }: { title: string; items: { m: SlimMod; note?: string }[]; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <div>
      <h3 className={SUB}>{title}</h3>
      {items.length ? <ul className="grid gap-2 sm:grid-cols-2">{items.map((x) => <RelationCard key={x.m.id} {...x} />)}</ul> : <p className="text-[15px] text-dim">{empty}</p>}
    </div>
  );
}

/** Files of the newest archive as a folder tree, folded by default (it can be long). */
function FileTree({ files }: { files: string[] }) {
  type Node = { [k: string]: Node };
  const root: Node = {};
  for (const f of files) f.split("/").reduce((n, part) => (n[part] ??= {}), root);
  const render = (n: Node, depth: number): ReactNode => (
    <ul className={depth ? "ml-4 border-l border-line pl-3" : ""}>
      {Object.keys(n)
        .sort((a, b) => Number(!Object.keys(n[a]).length) - Number(!Object.keys(n[b]).length) || a.localeCompare(b))
        .map((k) => (
          <li key={k} className="py-0.5">
            <span className={Object.keys(n[k]).length ? "text-hi" : "text-soft"}>{Object.keys(n[k]).length ? `${k}/` : k}</span>
            {Object.keys(n[k]).length > 0 && render(n[k], depth + 1)}
          </li>
        ))}
    </ul>
  );
  return <div className="font-mono text-[13px]">{render(root, 0)}</div>;
}

/** One mod's page: a showcase to scroll through, with the install button always in reach. */
export default async function ModPage(props: PageProps<"/mods/[id]">) {
  const { id } = await props.params;
  const { mod: listed, catalog } = await getMod(id);
  if (!listed) notFound();
  const mod = await withDetails(listed);

  const site = siteUrl();
  const now = renderedAt();
  const all = catalog.mods.map((m) => slim(m, catalog));
  const byId = new Map(all.map((m) => [m.id, m]));
  const v = latest(mod, catalog.revoked);
  const works = worksWith(mod, catalog.ports, catalog.revoked);
  const revokedAll = isWithdrawn(catalog.revoked, mod.id);
  const held = !revokedAll && !!mod.held;
  const banner = mod.media.banner ?? mod.media.screenshots[0] ?? null;
  const [blur, discussion] = await Promise.all([thumbDataUrl(banner?.thumbhash), getDiscussion(mod.indexSource, mod.discussion)]);
  const discussionUrl = mod.discussion ? `${mod.indexSource.replace(/\/$/, "")}/discussions/${mod.discussion}` : undefined;
  const usedBy = dependents(catalog.mods, mod.id, catalog.revoked).flatMap((m) => byId.get(m.id) ?? []);
  const conflictsWith = all.filter((m) => m.id !== mod.id && (v?.conflicts.some((c) => c.id === m.id) || m.conflicts.includes(mod.id)));
  const link = (ids: string[]) => ids.flatMap((i) => byId.get(i) ?? []);

  const gallery: GalleryItem[] = [
    ...mod.media.videos.map((x) => ({ kind: "video" as const, youtube: x.youtube, title: x.title ?? `${mod.name}: ${x.caption ?? "video"}`, caption: x.caption })),
    ...mod.media.screenshots.map((s, i) => ({ kind: "image" as const, img: slimImageOf(s)!, caption: s.caption, alt: s.alt ?? s.caption ?? `${mod.name} screenshot ${i + 1}` })),
  ];
  // Relative links in the page text point next to the file it came from, the changelogs' into the mod's folder, at the release shown.
  const where = repoLinks(mod, v?.tag);
  const install = !revokedAll && !held && v && (
    <InstallButton mods={[{ id: mod.id }]} game={gameOf(mod.games)} label={mod.type === "pack" ? "Install modpack" : "Install"} devOnly={works !== "release"} />
  );

  const ld = modLd(site, {
    ...mod,
    version: v?.version,
    platforms: Object.keys(v?.platforms ?? {}),
    image: banner ? `${site}${mediaSrc(banner, widthFor(banner, 1600), "webp")}` : undefined,
    screenshots: mod.media.screenshots.map((s) => `${site}${mediaSrc(s, widthFor(s, 1600), "webp")}`),
    videos: mod.media.videos,
    game: gameName(mod),
  });

  const gameIds = Object.keys(mod.games);
  const shownMods = catalog.mods.filter((m) => !isWithdrawn(catalog.revoked, m.id) && !m.held);
  const perGame = [...new Set(shownMods.flatMap((m) => Object.keys(m.games)))]
    .map((g) => ({ id: g, n: shownMods.filter((m) => m.games[g]).length }))
    .sort((a, b) => b.n - a.n);
  const kind = mod.type === "native" ? "⚠ Runs code" : mod.type === "script" ? "⚙ Script" : mod.type === "pack" ? "▤ Modpack" : "◫ Data pack";
  const row = (k: string, x: ReactNode) =>
    x ? (
      <div key={k} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 border-t border-line py-2.5 first:border-0">
        <dt className="text-dim">{k}</dt>
        <dd className="text-soft [overflow-wrap:anywhere]">{x}</dd>
      </div>
    ) : null;

  const side = (
    <>
      <Link href="/mods" className={sideItem(false)}>
        ← All mods
      </Link>
      <SideGroup title="Games">
        {perGame.map((g) => (
          <Link key={g.id} href={g.id === perGame[0]?.id ? "/mods" : `/mods?game=${g.id}`} className={sideItem(gameIds.includes(g.id))}>
            {GAME_LABEL[g.id] ?? g.id}
            <Count n={g.n} />
          </Link>
        ))}
      </SideGroup>
    </>
  );
  const top = (
    <>
      <form action="/mods" role="search" className="relative min-w-0 flex-1">
        <label>
          <span className="sr-only">Search mods</span>
          <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 fill-none stroke-dim stroke-2">
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input type="search" name="q" enterKeyHint="search" autoComplete="off" spellCheck={false} placeholder="Search mods" className="field h-11 pl-10" />
        </label>
      </form>
      <Link href="/mods#publish" className="btn flex-none max-sm:hidden">
        Publish your mod
      </Link>
    </>
  );

  return (
    <ModsShell side={side} top={top} menuLabel={<span>Mods <span className="font-normal text-dim">· {gameName(mod)}</span></span>}>
      <main id="content" className="pb-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />

        <nav aria-label="Breadcrumb" className="mb-4 text-[14px] text-dim">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/mods" className="text-dim no-underline hover:text-hi">
                Mods
              </Link>{" "}
              /
            </li>
            <li>
              <Link href={gameIds[0] && gameIds[0] !== perGame[0]?.id ? `/mods?game=${gameIds[0]}` : "/mods"} className="text-dim no-underline hover:text-hi">
                {gameName(mod)}
              </Link>{" "}
              /
            </li>
            <li aria-current="page" className="text-soft">
              {mod.name}
            </li>
          </ol>
        </nav>

        <header className="flex flex-wrap items-center gap-x-5 gap-y-4">
          {/* Named like the mod's picture in the list: on browsers with view transitions it grows into this one. */}
          <ViewTransition name={`mod-${mod.id}`} share="morph" default="none">
            <div className="aspect-video w-[132px] flex-none overflow-hidden rounded-lg bg-gradient-to-br from-panel-hi to-ink bg-cover bg-center sm:w-[184px]" style={blur ? { backgroundImage: `url(${blur})` } : undefined}>
              {(mod.media.icon ?? banner) && <ModImage img={slimImageOf(banner ?? mod.media.icon)!} sizes="184px" priority alt="" className="size-full object-cover" style={{ backgroundColor: "transparent" }} />}
            </div>
          </ViewTransition>
          <div className="min-w-0 flex-1 basis-[260px]">
            <h1 className="text-balance text-[28px] font-semibold leading-[1.12] tracking-tight text-hi [overflow-wrap:anywhere] sm:text-[32px]">{mod.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-soft">
              <span>
                by <span className="text-hi">{mod.author}</span>
              </span>
              <TrustBadge trust={mod.trust} big />
              <span className="whitespace-nowrap">
                <b aria-hidden className={`font-normal ${mod.type === "native" ? "text-amber" : "text-dim"}`}>{kind.slice(0, 1)}</b>
                {kind.slice(1)}
              </span>
              {works !== "release" && <WorksBadge works={works} />}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {!revokedAll && !held && v && <AddToSet id={mod.id} />}
            {install && <div id="hero-install">{install}</div>}
          </div>
        </header>
        <p className="mt-5 max-w-[760px] text-[15.5px] leading-relaxed text-soft">{mod.description}</p>

        {revokedAll && (
          <p className="mt-6 rounded-lg border-l-2 border-amber bg-amber/10 px-4 py-3 text-soft">
            <b className="text-gold">This mod was taken off the list.</b> {catalog.revoked.find((r) => r.id === mod.id)?.reason} Launchers turn it off by themselves.
          </p>
        )}
        {held && (
          <p className="mt-6 rounded-lg border-l-2 border-coral bg-coral/10 px-4 py-3 text-soft">
            <b className="text-coral">Held for review.</b> The check of version {mod.held!.version} found something a person must look at first, so it is not offered now. Players keep the version they have.
          </p>
        )}
        {works !== "release" && !revokedAll && (
          <p className="mt-6 rounded-lg border-l-2 border-brand bg-brand/10 px-4 py-3 text-[15px] text-soft">
            {works === "dev" ? (
              <>
                <b className="text-gold">Needs the dev build of the launcher.</b> It uses parts of the mod interface the released launcher does not have yet. Each system in the{" "}
                <Link href="/install" className="text-amber">
                  download panel
                </Link>{" "}
                has a DEV link.
              </>
            ) : (
              <>
                <b className="text-gold">Needs a newer launcher than any released.</b> It will install once a launcher with its mod interface is out.
              </>
            )}
          </p>
        )}

        <div className="mt-8 grid gap-x-10 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid min-w-0 content-start gap-10">
            {gallery.length > 0 && (
              <section id="showcase" className="scroll-mt-6">
                <h2 className="sr-only">Showcase</h2>
                <Boundary what="gallery">
                  <MediaGallery items={gallery} name={mod.name} />
                </Boundary>
              </section>
            )}

            <section id="safety" className="scroll-mt-6">
              <div className="d-card p-5">
                <H2>Safety</H2>
                <dl className="text-[14.5px]">
                  {[
                    ["Label", mod.trust ? <><TrustBadge trust={mod.trust} edge /> <span className="ml-2">{TRUST_LABEL[mod.trust].hint}</span></> : "Not stated by this list"],
                    ["Runs", mod.type === "native" ? "Code on your computer, outside the game's sandbox" : mod.type === "script" ? "Scripts in the game's sandbox: they can only change the game" : "Nothing: it only adds files"],
                    ["Built", v?.built === "ci" ? <>Built by CI from tag <code className="rounded bg-ink-deep px-1.5 py-0.5 text-[13px] text-gold">{v.tag}</code></> : v?.built === "hand" ? "Uploaded by its author, not built by CI" : null],
                    ["Can reach", v?.scan ? (v.scan.labels.length ? <span className="flex flex-wrap gap-1.5">{v.scan.labels.map((l) => <span key={l} className="rounded bg-ink-deep px-2 py-0.5 text-[13px] text-soft">{l}</span>)}</span> : "Nothing outside the game") : null],
                    [v ? `New in ${v.version}` : "New", v?.scan ? (v.scan.new.length ? v.scan.new.join(", ") : "Nothing new it can reach") : null],
                    ["Problem?", <a key="report" href={reportUrl(mod.id)} className="text-amber" rel="noopener">Report this mod</a>],
                  ]
                    .filter(([, x]) => x)
                    .map(([k, x]) => (
                      <div key={String(k)} className="grid gap-x-6 gap-y-1 border-t border-line py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <dt className="text-dim">{k}</dt>
                        <dd className="text-soft [overflow-wrap:anywhere]">{x}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </section>

            <section id="about" className="scroll-mt-6">
              <H2>Read me</H2>
              {mod.readme?.trim() ? <Markdown base={where.page} anchors>{mod.readme}</Markdown> : <p className="text-soft">{mod.description}</p>}
            </section>

            <section id="relationships" className="scroll-mt-6">
              <H2>Relationships</H2>
              <div className="grid gap-6">
                <Relations
                  title="Requires"
                  items={(v?.requires ?? []).flatMap((r) => (byId.get(r.id) ? [{ m: byId.get(r.id)!, note: r.version ? `version ${r.version.replace(">=", "≥ ")}` : "any version" }] : []))}
                  empty="Nothing: it works on its own."
                />
                <Relations title="Recommended with it" items={link(mod.recommends).map((m) => ({ m }))} />
                <Relations title="Suggested" items={link(mod.suggests).map((m) => ({ m }))} />
                <Relations title="Can't run with" items={conflictsWith.map((m) => ({ m, note: v?.conflicts.find((c) => c.id === m.id)?.reason ?? "Conflicts with this mod" }))} />
                <Relations title="Used by" items={usedBy.map((m) => ({ m, note: "Needs this mod" }))} />
              </div>
            </section>

            <section id="versions" className="scroll-mt-6">
              <H2>Versions</H2>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {mod.versions.map((ver, i) => {
                  const gone = isRevoked(catalog.revoked, mod.id, ver.version);
                  return (
                    <li key={ver.version}>
                      <details className="d-card group open:pb-1" open={i === 0}>
                        <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                          <span className="font-semibold tabular-nums text-hi">{ver.version}</span>
                          {ver.prerelease && <span className="rounded bg-amber/10 px-2 text-[12px] text-amber">Pre-release</span>}
                          {gone && <span className="rounded bg-ink-deep px-2 text-[12px] text-dim">Withdrawn</span>}
                          <span className="text-[13px] text-dim">{new Date(ver.released).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="text-[13px] text-dim">{Object.values(ver.games).flat().map((d) => DISC_LABEL[d] ?? d).join(", ")}</span>
                          {ver.size > 0 && <span className="text-[13px] tabular-nums text-dim">{formatSize(ver.size)}</span>}
                          <span className="text-[13px] text-dim">{ver.api ? `interface ${ver.api}` : ""}</span>
                          <span aria-hidden className="plus ml-auto text-xl text-amber transition-transform">+</span>
                        </summary>
                        <div className="border-t border-line px-4 py-3">
                          {ver.changelog.trim() ? <Markdown base={where.folder}>{ver.changelog}</Markdown> : <p className="text-dim">No notes for this version.</p>}
                          {!gone && i > 0 && (
                            <div className="mt-3">
                              <InstallButton mods={[{ id: mod.id, version: ver.version }]} game={gameOf(ver.games)} label={`Install ${ver.version}`} small primary={false} devOnly={!apiFits(ver.api, catalog.ports.stable.api)} />
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>

            {v && v.files.length > 0 && (
              <section id="files" className="scroll-mt-6">
                <H2>Files</H2>
                <details className="d-card p-4">
                  <summary className="flex min-h-11 cursor-pointer items-center text-soft">
                    {v.files.length} file{v.files.length === 1 ? "" : "s"} in {v.version}
                  </summary>
                  <div className="mt-3 max-h-[420px] overflow-auto">
                    <FileTree files={v.files} />
                  </div>
                </details>
              </section>
            )}

            {discussionUrl && (
              <section id="comments" className="scroll-mt-6">
                <H2>Comments</H2>
                {discussion?.comments.length ? (
                  <ul className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-3">
                    {discussion.comments.map((c) => (
                      <li key={c.url} className="d-card p-4">
                        <p className="mb-2 flex items-center gap-2 text-[14px] text-dim">
                          {c.avatar && <Image src={c.avatar} alt="" width={22} height={22} className="size-[22px] rounded-full" />}
                          <span className="text-hi">{c.author}</span>
                          <a href={c.url} className="text-dim no-underline hover:underline" rel="nofollow ugc noopener">
                            {new Date(c.created).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </a>
                        </p>
                        <Markdown base={discussionUrl}>{c.body}</Markdown>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-4 text-soft">No comments yet. Tried it? Say how it went.</p>
                )}
                <a href={discussionUrl} className="btn" rel="noopener">
                  <GithubIcon className="size-4" />
                  {discussion && discussion.total > discussion.comments.length ? `All ${discussion.total} comments on GitHub` : "Comment on GitHub"}
                </a>
              </section>
            )}
          </div>

          {/* Beside the page on a wide screen, under the header on a narrow one. */}
          <aside className="grid content-start gap-8 max-[1100px]:order-first">
            <section id="details" className="d-card p-5">
              <H2>Details</H2>
              <dl className="text-[14.5px]">
                {row("Version", v?.version)}
                {row("Updated", ago(mod.updated, now))}
                {row("Downloads", <span title={mod.downloads.toLocaleString("en-US")}>{formatCount(mod.downloads)}</span>)}
                {row("Game", gameIds.map((g) => GAME_LABEL[g] ?? g).join(", "))}
                {row("Discs", [...new Set(Object.values(mod.games).flat())].map((d) => DISC_LABEL[d] ?? d).join(", "))}
                {row("Systems", Object.keys(v?.platforms ?? {}).map((p) => PLATFORM_LABEL[p] ?? p).join(", ") || (mod.type === "pack" ? "Any" : null))}
                {row("Size", v?.size ? formatSize(v.size) : null)}
                {row("License", mod.license ?? "Not stated")}
                {row("Interface", v?.api ? `${v.api}${apiFits(v.api, catalog.ports.stable.api) ? " (release ✓)" : apiFits(v.api, catalog.ports.dev.api) ? " (dev build)" : ""}` : null)}
                {row("Impact", mod.impact.map((i) => IMPACT_LABEL[i]).join(", ") || null)}
                {row("Tags", mod.tags.join(", ") || null)}
                {row("AI", mod.aiAssisted === undefined ? null : <>{mod.aiAssisted ? "Yes" : "No"}, stated by the author (<Link href="/#ai" className="text-amber">our view</Link>)</>)}
                {row("Id", <code className="text-[13px] text-gold">{mod.id}</code>)}
                {row(
                  "Links",
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    <a href={mod.homepage ?? mod.repo} className="text-amber" rel="nofollow ugc noopener">
                      Source
                    </a>
                    {where.readme && (
                      <a href={where.readme} className="text-amber" rel="nofollow ugc noopener">
                        README on GitHub
                      </a>
                    )}
                    {mod.links?.bugs && (
                      <a href={mod.links.bugs} className="text-amber" rel="nofollow ugc noopener">
                        Bugs
                      </a>
                    )}
                    {mod.links?.docs && (
                      <a href={mod.links.docs} className="text-amber" rel="nofollow ugc noopener">
                        Docs
                      </a>
                    )}
                    {mod.links?.discord && (
                      <a href={mod.links.discord} className="text-amber" rel="nofollow ugc noopener">
                        Discord
                      </a>
                    )}
                  </span>,
                )}
              </dl>
            </section>
            <div className="grid gap-2 text-[14px] text-dim">
              {mod.type === "native" && <p className="text-soft">⚠ Runs native code on your computer. Every file is checked against the signed mod list before use.</p>}
              <p>Install opens the OpenRAC launcher, which adds what the mod needs and keeps it up to date.</p>
              <a href={CONTENT_RULES} className="text-dim">
                Report a problem with this listing
              </a>
            </div>
          </aside>
        </div>

        {/* Takes over from the header's Install once that has scrolled away, so only one shows at a time. */}
        {install && (
          <InstallBar watch="hero-install">
            <p className="min-w-0 flex-1 truncate text-[14px] text-soft">
              <b className="font-semibold text-hi">{mod.name}</b>
              {v && <span className="tabular-nums"> · {v.version}</span>}
              {mod.type === "native" && <span aria-label="runs native code"> · ⚠</span>}
            </p>
            {install}
          </InstallBar>
        )}
      </main>
    </ModsShell>
  );
}
