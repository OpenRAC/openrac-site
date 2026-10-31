import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DiscordIcon, GithubIcon } from "@/components/ui/icons";
import Markdown from "@/components/ui/Markdown";
import AddToSet from "@/components/mods/AddToSet";
import { DiscBadges, ImpactBadges, TypeBadge, WorksBadge } from "@/components/mods/Badges";
import InPageNav from "@/components/mods/InPageNav";
import InstallButton from "@/components/mods/InstallButton";
import MediaGallery, { type GalleryItem } from "@/components/mods/MediaGallery";
import ModImage from "@/components/mods/ModImage";
import { formatSize } from "@/lib/format";
import { ldJson, modLd, siteUrl } from "@/lib/machine";
import Image from "next/image";
import { getMod, getMods } from "@/lib/mods";
import { getDiscussion } from "@/lib/mods/discussion";
import { CONTENT_RULES } from "@/lib/mods/links";
import {
  DISC_LABEL,
  GAME_LABEL,
  IMPACT_LABEL,
  PLATFORM_LABEL,
  TYPE_LABEL,
  ago,
  renderedAt,
  apiFits,
  dependents,
  formatCount,
  isRevoked,
  latest,
  mediaSrc,
  widthFor,
  worksWith,
} from "@/lib/mods/logic";
import { slim, slimImageOf, thumbDataUrl, type SlimMod } from "@/lib/mods/slim";
import type { ListedMod, ModCatalog } from "@/lib/mods/types";

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
  const { mod } = await getMod(id);
  if (!mod) return { title: "Mod not found", robots: { index: false } };
  const title = `${mod.name} · ${shortGame(mod)} mod`;
  const description = mod.description.length > 155 ? `${mod.description.slice(0, 152).trimEnd()}…` : mod.description;
  return {
    title,
    description,
    alternates: { canonical: `/mods/${mod.id}` },
    openGraph: { title: `${title} · OpenRAC`, description, url: `/mods/${mod.id}`, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description },
  };
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mb-4 font-audiowide text-[clamp(22px,3vw,28px)] leading-tight text-hi">{children}</h2>;
const SUB = "mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi";

/** A small linked card for a related mod. */
function RelationCard({ m, note }: { m: SlimMod; note?: string }) {
  return (
    <li>
      <Link href={`/mods/${m.id}`} className="surface surface-link flex items-center gap-3 p-2.5 pr-4 no-underline">
        {m.card ? <ModImage img={m.card} sizes="80px" className="aspect-video w-20 flex-none rounded-lg object-cover" /> : <span aria-hidden className="aspect-video w-20 flex-none rounded-lg bg-gradient-to-br from-panel-hi to-ink" />}
        <span className="min-w-0">
          <span className="block font-orbitron text-[15px] font-bold text-gold [overflow-wrap:anywhere]">{m.name}</span>
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

function Facts({ mod, catalog, now }: { mod: ListedMod; catalog: ModCatalog; now: number }) {
  const v = latest(mod, catalog.revoked);
  const plats = Object.keys(v?.platforms ?? {});
  const row = (k: string, val: ReactNode) =>
    val ? (
      <div className="flex justify-between gap-4 border-t border-line py-2 first:border-0">
        <dt className="text-dim">{k}</dt>
        <dd className="text-right text-soft">{val}</dd>
      </div>
    ) : null;
  return (
    <dl className="text-[14px]">
      {row("Version", v && <span className="tabular-nums">v{v.version}</span>)}
      {row("Size", v?.size ? formatSize(v.size) : null)}
      {row("Updated", ago(mod.updated, now))}
      {row(
        "Discs",
        Object.entries(mod.games)
          .map(([g, ds]) => `${GAME_LABEL[g] ?? g}: ${ds.map((d) => DISC_LABEL[d] ?? d).join(", ")}`)
          .join(" · "),
      )}
      {row("Systems", plats.length ? plats.map((p) => PLATFORM_LABEL[p] ?? p).join(", ") : mod.type === "pack" ? "Any (installs other mods)" : null)}
      {row("License", mod.license)}
      {row("Downloads", <span title={mod.downloads.toLocaleString("en-US")}>{formatCount(mod.downloads)}</span>)}
    </dl>
  );
}

/** One mod's page: a showcase to scroll through, with the install button always in reach. */
export default async function ModPage(props: PageProps<"/mods/[id]">) {
  const { id } = await props.params;
  const { mod, catalog } = await getMod(id);
  if (!mod) notFound();

  const site = siteUrl();
  const now = renderedAt();
  const all = catalog.mods.map((m) => slim(m, catalog));
  const byId = new Map(all.map((m) => [m.id, m]));
  const v = latest(mod, catalog.revoked);
  const works = worksWith(mod, catalog.ports, catalog.revoked);
  const revokedAll = catalog.revoked.some((r) => r.id === mod.id && r.versions.includes("*"));
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
  const sections = [
    gallery.length && { id: "showcase", label: "Showcase" },
    { id: "about", label: "About" },
    { id: "details", label: "Details" },
    { id: "relationships", label: "Relationships" },
    { id: "versions", label: "Versions" },
    v?.files.length && { id: "files", label: "Files" },
    discussionUrl && { id: "comments", label: "Comments" },
  ].filter((s): s is { id: string; label: string } => !!s);

  // Relative links in the README and changelogs point into the mod's own folder, at the release shown.
  const readmeBase = `${mod.repo.replace(/\/$/, "")}/blob/${v?.tag || "HEAD"}/${mod.path ? `${mod.path.replace(/^\/|\/$/g, "")}/` : ""}`;
  const install = !revokedAll && v && (
    <InstallButton mods={[{ id: mod.id }]} label={mod.type === "pack" ? "Install modpack" : "Install"} devOnly={works !== "release"} />
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

  return (
    <main className="pb-24 min-[821px]:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />

      {/* The hero: the banner full width, darkened where the title sits. */}
      <div className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-panel-hi to-ink bg-cover bg-center" style={blur ? { backgroundImage: `url(${blur})` } : undefined}>
          {banner && <ModImage img={slimImageOf(banner)!} sizes="100vw" priority className="size-full object-cover saturate-[.8]" style={{ backgroundColor: "transparent" }} />}
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/75 to-ink/20" />
        <div className="mx-auto max-w-[1080px] px-4 pb-8 pt-[clamp(120px,22vw,240px)]">
          <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-dim">
            <ol className="flex flex-wrap gap-1.5">
              <li>
                <Link href="/" className="text-dim no-underline hover:text-hi">
                  Home
                </Link>{" "}
                ›
              </li>
              <li>
                <Link href="/mods" className="text-dim no-underline hover:text-hi">
                  Mods
                </Link>{" "}
                ›
              </li>
              <li aria-current="page" className="text-soft">
                {mod.name}
              </li>
            </ol>
          </nav>
          <div className="flex items-end gap-4">
            {mod.media.icon && <ModImage img={slimImageOf(mod.media.icon)!} sizes="88px" alt="" className="size-[72px] flex-none rounded-2xl border border-white/15 object-cover sm:size-[88px]" />}
            <div className="min-w-0">
              <h1 className="font-audiowide text-[clamp(30px,5.5vw,54px)] leading-[1.05] text-text [overflow-wrap:anywhere]">{mod.name}</h1>
              <p className="mt-1.5 text-[15px] text-soft">
                by <span className="text-hi">{mod.author}</span>
                {v && <span className="tabular-nums"> · v{v.version}</span>} · <span title={`${mod.downloads.toLocaleString("en-US")} downloads`}>{formatCount(mod.downloads)} downloads</span>
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[680px] text-[16px] leading-relaxed text-soft sm:text-[17px]">{mod.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <TypeBadge type={mod.type} />
            <WorksBadge works={works} />
            <ImpactBadges impact={mod.impact} max={5} />
            <DiscBadges games={mod.games} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {install}
            {!revokedAll && v && <AddToSet id={mod.id} />}
            <a href={mod.homepage ?? mod.repo} className="btn" rel="nofollow ugc noopener">
              <GithubIcon className="size-4" />
              Source
            </a>
            {mod.links?.discord && (
              <a href={mod.links.discord} className="btn btn-discord" rel="nofollow ugc noopener">
                <DiscordIcon className="size-4" />
                Discord
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1080px] px-4">
        <InPageNav sections={sections} />

        {revokedAll && (
          <p className="mt-6 rounded-xl border-l-4 border-amber bg-amber/10 px-4 py-3 text-soft">
            <b className="text-gold">This mod was taken off the list.</b> {catalog.revoked.find((r) => r.id === mod.id)?.reason} Launchers turn it off by themselves.
          </p>
        )}
        {works !== "release" && !revokedAll && (
          <p className="mt-6 rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 text-[15px] text-soft">
            {works === "dev" ? (
              <>
                <b className="text-gold">Needs the dev build of the launcher.</b> It uses parts of the mod interface the released launcher does not have yet. Each system in the{" "}
                <Link href="/#download" className="text-amber">
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

        <div className="grid gap-x-10 min-[821px]:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {gallery.length > 0 && (
              <section id="showcase" data-reveal="fade" className="scroll-mt-28 pt-8">
                <h2 className="sr-only">Showcase</h2>
                <MediaGallery items={gallery} name={mod.name} />
              </section>
            )}

            <section id="about" data-reveal="fade" className="scroll-mt-28 pt-10">
              <H2>About</H2>
              {mod.readme?.trim() ? <Markdown base={readmeBase}>{mod.readme}</Markdown> : <p className="text-soft">{mod.description}</p>}
            </section>

            <section id="details" data-reveal="fade" className="scroll-mt-28 pt-10">
              <H2>Details</H2>
              <div className="surface p-5">
                <dl className="grid gap-x-8 text-[14px] sm:grid-cols-2">
                  {[
                    ["Id", <code key="id" className="text-gold">{mod.id}</code>],
                    ["Type", `${TYPE_LABEL[mod.type]}${mod.type === "native" ? " (runs native code)" : mod.type === "script" ? " (sandboxed scripts)" : ""}`],
                    ["Author", mod.author],
                    ["License", mod.license ?? "Not stated"],
                    ["Mod interface", v?.api ? `${v.api}${apiFits(v.api, catalog.ports.stable.api) ? " (release ✓)" : apiFits(v.api, catalog.ports.dev.api) ? " (dev build)" : ""}` : "Not needed"],
                    ["Games", Object.entries(mod.games).map(([g, ds]) => `${GAME_LABEL[g] ?? g} (${ds.map((d) => DISC_LABEL[d] ?? d).join(", ")})`).join("; ")],
                    ["Systems", Object.keys(v?.platforms ?? {}).map((p) => PLATFORM_LABEL[p] ?? p).join(", ") || "Any"],
                    ["Impact", mod.impact.map((i) => IMPACT_LABEL[i]).join(", ") || "Not stated"],
                    ["Tags", mod.tags.join(", ") || "None"],
                    ["First released", new Date(mod.created).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
                    ["Updated", new Date(mod.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
                    ["Hook points", v?.hooks?.length ? v.hooks.join(", ") : null],
                  ]
                    .filter(([, x]) => x)
                    .map(([k, x]) => (
                      <div key={String(k)} className="flex justify-between gap-4 border-t border-line py-2.5 sm:[&:nth-child(-n+2)]:border-0 max-sm:first:border-0">
                        <dt className="flex-none text-dim">{k}</dt>
                        <dd className="text-right text-soft [overflow-wrap:anywhere]">{x}</dd>
                      </div>
                    ))}
                </dl>
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-[14px]">
                  <a href={mod.repo} className="text-amber" rel="nofollow ugc noopener">
                    Repository
                  </a>
                  {mod.links?.bugs && (
                    <a href={mod.links.bugs} className="text-amber" rel="nofollow ugc noopener">
                      Report a bug
                    </a>
                  )}
                  {mod.links?.docs && (
                    <a href={mod.links.docs} className="text-amber" rel="nofollow ugc noopener">
                      Docs
                    </a>
                  )}
                  <a href={CONTENT_RULES} className="text-dim">
                    Report a problem with this listing
                  </a>
                </p>
              </div>
            </section>

            <section id="relationships" data-reveal="fade" className="scroll-mt-28 pt-10">
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

            <section id="versions" data-reveal="fade" className="scroll-mt-28 pt-10">
              <H2>Versions</H2>
              <ul className="grid gap-2">
                {mod.versions.map((ver, i) => {
                  const gone = isRevoked(catalog.revoked, mod.id, ver.version);
                  return (
                    <li key={ver.version}>
                      <details className="surface group open:pb-1" open={i === 0}>
                        <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                          <span className="font-orbitron font-bold tabular-nums text-gold">v{ver.version}</span>
                          {ver.prerelease && <span className="rounded-full border border-amber/40 px-2 font-orbitron text-[10px] uppercase tracking-[.15em] text-amber">Pre-release</span>}
                          {gone && <span className="rounded-full border border-white/15 px-2 font-orbitron text-[10px] uppercase tracking-[.15em] text-dim">Withdrawn</span>}
                          <span className="text-[13px] text-dim">{new Date(ver.released).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="text-[13px] text-dim">{Object.values(ver.games).flat().map((d) => DISC_LABEL[d] ?? d).join(", ")}</span>
                          {ver.size > 0 && <span className="text-[13px] tabular-nums text-dim">{formatSize(ver.size)}</span>}
                          <span className="text-[13px] text-dim">{ver.api ? `interface ${ver.api}` : ""}</span>
                          <span aria-hidden className="plus ml-auto text-xl text-amber transition-transform">+</span>
                        </summary>
                        <div className="border-t border-line px-4 py-3">
                          {ver.changelog.trim() ? <Markdown base={readmeBase}>{ver.changelog}</Markdown> : <p className="text-dim">No notes for this version.</p>}
                          {!gone && i > 0 && (
                            <div className="mt-3">
                              <InstallButton mods={[{ id: mod.id, version: ver.version }]} label={`Install v${ver.version}`} small primary={false} devOnly={!apiFits(ver.api, catalog.ports.stable.api)} />
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
              <section id="files" data-reveal="fade" className="scroll-mt-28 pt-10">
                <H2>Files</H2>
                <details className="surface p-4">
                  <summary className="cursor-pointer text-soft">
                    {v.files.length} file{v.files.length === 1 ? "" : "s"} in v{v.version}
                  </summary>
                  <div className="mt-3 max-h-[420px] overflow-auto">
                    <FileTree files={v.files} />
                  </div>
                </details>
              </section>
            )}

            {discussionUrl && (
              <section id="comments" data-reveal="fade" className="scroll-mt-28 pt-10">
                <H2>Comments</H2>
                {discussion?.comments.length ? (
                  <ul className="mb-4 grid gap-3">
                    {discussion.comments.map((c) => (
                      <li key={c.url} className="surface p-4">
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

          {/* The side panel: sticky on a wide screen; on a phone its facts come after the page and Install sits at the bottom. */}
          <aside className="pt-8 max-[821px]:order-first max-[821px]:pt-6">
            <div className="surface sticky top-[112px] grid gap-4 p-5">
              <div className="max-[821px]:hidden">{install}</div>
              <Facts mod={mod} catalog={catalog} now={now} />
              {mod.type === "native" && (
                <p className="rounded-xl border-l-4 border-amber bg-amber/10 px-3 py-2.5 text-[13px] text-soft">
                  <span aria-hidden>⚠ </span>Runs native code on your computer. Every file is checked against the signed mod list before use.
                </p>
              )}
              {mod.type === "script" && <p className="text-[13px] text-dim">Runs in the game&apos;s script sandbox.</p>}
              <p className="text-[13px] text-dim">Install opens the OpenRAC launcher, which adds what the mod needs and keeps it up to date.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Install in thumb reach on a phone. */}
      {install && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md min-[821px]:hidden">
          <div className="mx-auto flex max-w-[1080px] items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-[14px] text-soft">
              <b className="font-orbitron text-gold">{mod.name}</b>
              {v && <span className="tabular-nums"> · v{v.version}</span>}
              {mod.type === "native" && <span aria-label="runs native code"> · ⚠</span>}
            </p>
            {install}
          </div>
        </div>
      )}
    </main>
  );
}
