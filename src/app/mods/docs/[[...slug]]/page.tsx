import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Changelog from "@/components/modDocs/Changelog";
import Code from "@/components/modDocs/Code";
import CppReference, { cppToc } from "@/components/modDocs/CppReference";
import CReference, { cToc } from "@/components/modDocs/CReference";
import DocMarkdown, { type LinkContext } from "@/components/modDocs/DocMarkdown";
import DocsShell from "@/components/modDocs/DocsShell";
import HookExplorer from "@/components/modDocs/HookExplorer";
import LuauReference, { luauToc } from "@/components/modDocs/LuauReference";
import ManifestBuilder from "@/components/modDocs/ManifestBuilder";
import LangMemory from "@/components/modDocs/LangMemory";
import Since from "@/components/modDocs/Since";
import { SHARE_IMAGE, siteUrl } from "@/lib/machine";
import { getDocsIndex, getRelease } from "@/lib/modDocs";
import { docsHref, firstMod, gameName, manifestExamples, manifestHelp, pagesOf, parseSlug, REPO, slugger } from "@/lib/modDocs/logic";
import type { Release } from "@/lib/modDocs/types";

// Every page is built ahead from mod-docs/data/; any other address is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  const index = getDocsIndex();
  return index.versions.flatMap((v) => {
    const paths = pagesOf(getRelease(v.version)).map((p) => p.path);
    return paths.flatMap((p) => {
      const parts = p ? p.split("/") : [];
      return v.version === index.latest ? [{ slug: parts }, { slug: [v.version, ...parts] }] : [{ slug: [v.version, ...parts] }];
    });
  });
}

function resolve(slug: string[] | undefined) {
  const index = getDocsIndex();
  const at = parseSlug(slug, index);
  if (!at) return null;
  const release = getRelease(at.version);
  const pages = pagesOf(release);
  const page = pages.find((p) => p.path === at.path);
  return page ? { index, release, pages, page, version: at.version } : null;
}

export async function generateMetadata(props: PageProps<"/mods/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await props.params;
  const at = resolve(slug);
  if (!at) return { title: "Page not found", robots: { index: false } };
  const { page, version, index, release } = at;
  const name = page.parent ? `${page.parent}: ${page.title}` : page.title;
  const title = page.kind === "overview" ? "Mod SDK docs" : `${name} · Mod SDK docs`;
  const description =
    page.kind === "overview"
      ? `How to make mods for OpenRAC, the native port of Ratchet & Clank: script mods in Luau, native mods in C and C++, and the full API reference of SDK ${version}.`
      : page.kind === "guide"
        ? `${page.title}: a guide to making mods for OpenRAC with SDK ${version}.`
        : `${name} of the OpenRAC mod SDK ${version}${page.blurb ? `: ${page.blurb}` : ""}.`;
  // One address per page for search engines: the latest release's, without the version.
  const canonical = docsHref(index.latest, pagesOf(getRelease(index.latest)).some((p) => p.path === page.path) ? page.path : "", index.latest);
  const url = docsHref(version, page.path, index.latest);
  return {
    title,
    description,
    alternates: { canonical },
    robots: version === index.latest ? undefined : { index: false, follow: true },
    openGraph: { title: `${title} · OpenRAC`, description, url, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description, images: [SHARE_IMAGE] },
    other: { "openrac:sdk-version": release.version },
  };
}

/** Guides about one language: reading one makes it the language the hook explorer shows. */
const GUIDE_LANG: Record<string, "luau" | "c" | "cpp"> = { scripts: "luau", "native-c": "c", "native-cpp": "cpp" };

function headingsToc(markdown: string) {
  const slug = slugger();
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => ({ id: slug(m[2].trim()), label: m[2].replace(/`/g, "").trim(), depth: m[1].length }));
}

function Overview({ r, latest, ctx }: { r: Release; latest: string; ctx: LinkContext }) {
  const at = (p: string) => docsHref(r.version, p, latest);
  const has = (slug: string) => r.guides.some((g) => g.slug === slug);
  const paths = [
    r.luau && has("scripts") && { href: at("scripts"), title: "Script mod", lang: "Luau", text: "A text editor is all you need. Runs on every platform, Android too, in a sandbox." },
    has("native-c") && { href: at("native-c"), title: "Native mod in C", lang: "C", text: "A small library the game loads. Full speed, full reach. You build it for each platform." },
    r.cpp && has("native-cpp") && { href: at("native-cpp"), title: "Native mod in C++", lang: "C++", text: "The same, with less code: hooks as lambdas, typed settings, no manual cleanup." },
  ].filter(Boolean) as { href: string; title: string; lang: string; text: string }[];
  const first = has("getting-started") && has("troubleshooting") ? firstMod(r) : null;
  const added = Object.values(r.changes.api).reduce((n, p) => n + p.added.length, 0);
  return (
    <div className="grid gap-8">
      {has("getting-started") && (
        <div className="flex flex-wrap gap-3">
          <a href={at("getting-started")} className="d-btn d-btn-primary">
            Make your first mod
          </a>
          <a href={at("tools/manifest")} className="d-btn">
            Try the manifest builder
          </a>
          {r.hooks[0] && (
            <a href={at(`reference/hooks-${r.hooks[0].game}`)} className="d-btn">
              Browse hook points
            </a>
          )}
        </div>
      )}
      {first && (
        <section aria-labelledby="first" className="grid gap-3">
          <h2 id="first" className="text-[19px] font-semibold text-hi">
            Your first mod in two minutes
          </h2>
          <ol className="grid gap-3 text-[15px] leading-relaxed text-body">
            <li className="grid gap-2">
              <span>
                <span className="mr-2 font-semibold text-amber">1</span>Make a folder with these two files. No compiler, no SDK download.
              </span>
              <div className="grid gap-3">
                <Code code={first.script} lang="luau" title="main.luau" className="my-0" />
                <Code code={first.manifest} lang="json" title="openrac-mod.json" className="my-0" />
              </div>
            </li>
            <li>
              <span className="mr-2 font-semibold text-amber">2</span>In the launcher&apos;s <b className="text-hi">Mods</b> tab, <b className="text-hi">Add a mod</b> and pick the folder. Switch it on and press Play.
            </li>
            <li>
              <span className="mr-2 font-semibold text-amber">3</span>Walk into an enemy: Ratchet&apos;s health stays full (a fall still costs a life). If it drops, the mod is off or did not load; see{" "}
              <a href={at("troubleshooting")} className="text-amber underline">
                troubleshooting
              </a>
              .
            </li>
          </ol>
          <p className="text-[14.5px] text-soft">
            Next: <a href={at("getting-started")} className="text-amber underline">make it a real mod</a> with the template and share it, or pick another hook point in{" "}
            <a href={at(`reference/hooks-${first.game}`)} className="text-amber underline">the hook points</a>.
          </p>
        </section>
      )}
      {paths.length > 0 && (
        <section aria-labelledby="pick" className="grid gap-3">
          <h2 id="pick" className="text-[19px] font-semibold text-hi">
            Pick your way in
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {paths.map((p) => (
              <a key={p.href} href={p.href} className="d-card d-card-link grid content-start gap-2 p-3.5 no-underline">
                <span className="text-[12.5px] font-semibold text-brand">{p.lang}</span>
                <span className="text-[15.5px] font-semibold text-hi">{p.title}</span>
                <span className="text-[14px] leading-relaxed text-soft">{p.text}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <section aria-labelledby="ref" className="grid gap-3">
        <h2 id="ref" className="text-[19px] font-semibold text-hi">
          Reference
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {pagesOf(r)
            .filter((p) => p.group === "Reference" && (!p.parent || p === pagesOf(r).find((x) => x.parent === p.parent)))
            .map((p) => (
              <a key={p.path} href={at(p.path)} className="d-card d-card-link grid gap-1 p-3.5 no-underline">
                <span className="font-semibold text-hi">{p.parent ?? p.title}</span>
                {p.blurb && <span className="text-[14px] text-soft">{p.blurb}</span>}
              </a>
            ))}
        </div>
      </section>
      <section aria-labelledby="new" className="d-card grid gap-2 p-4">
        <h2 id="new" className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-hi">
          In this release <Since since={r.interface} iface={r.interface} />
        </h2>
        <p className="text-[14.5px] text-body">
          SDK {r.version}, released <time dateTime={r.date}>{r.date}</time>, describes mod interface {r.interface}.
          {r.changes.since ? ` Since ${r.changes.since}: ${added} new name${added === 1 ? "" : "s"} in the API.` : ""}{" "}
          <a href={`${at("changelog")}#v${r.version}`} className="font-semibold text-amber underline">
            What changed
          </a>
        </p>
      </section>
      <DocMarkdown ctx={ctx}>{r.overview}</DocMarkdown>
    </div>
  );
}

export default async function DocsPage(props: PageProps<"/mods/docs/[[...slug]]">) {
  const { slug } = await props.params;
  const at = resolve(slug);
  if (!at) notFound();
  const { index, release: r, pages, page, version } = at;
  const latest = index.latest;
  const versions = index.versions.map((v) => ({ version: v.version, date: v.date, iface: v.interface, paths: pagesOf(getRelease(v.version)).map((p) => p.path) }));
  const guideSlugs = r.guides.map((g) => g.slug);
  const ctx = (from: string): LinkContext => ({ from, tag: r.tag, version, latest, guides: guideSlugs });
  const shell = { index, versions, version, pages, page };
  const source = (path: string) => (
    <p className="mt-10 text-[13.5px] text-dim">
      Generated from{" "}
      <a href={`${REPO}/blob/${r.tag}/${path}`} className="text-soft underline" rel="noopener">
        {path}
      </a>{" "}
      at {r.tag}.{" "}
      <a href={`${REPO}/edit/develop/${path}`} className="text-soft underline" rel="noopener">
        Edit this page
      </a>{" "}
      or{" "}
      <a href={`${REPO}/issues/new?title=${encodeURIComponent(`Docs: ${page.parent ? `${page.parent}: ` : ""}${page.title}`)}&body=${encodeURIComponent(`Page: ${siteUrl()}${docsHref(version, page.path, latest)} (SDK ${version})\n\nWhat is wrong or missing:\n`)}`} className="text-soft underline" rel="noopener">
        report a problem
      </a>
      .
    </p>
  );

  switch (page.kind) {
    case "overview":
      return (
        <DocsShell {...shell} title="Make mods for OpenRAC" lead="Change how Ratchet & Clank plays in OpenRAC: new moves, swapped buttons, tweaks to enemies. These docs teach the mod SDK one piece at a time, with code you can copy">
          <Overview r={r} latest={latest} ctx={ctx(r.guides.length ? "sdk/docs/README.md" : "sdk/README.md")} />
        </DocsShell>
      );
    case "guide": {
      const g = r.guides.find((x) => x.slug === page.path)!;
      return (
        <DocsShell {...shell} title={g.title.replace(/`/g, "")} toc={headingsToc(g.markdown)}>
          {GUIDE_LANG[g.slug] && <LangMemory lang={GUIDE_LANG[g.slug]} />}
          <DocMarkdown ctx={ctx(`sdk/docs/${g.slug}.md`)}>{g.markdown}</DocMarkdown>
          {source(`sdk/docs/${g.slug}.md`)}
        </DocsShell>
      );
    }
    case "c":
      return (
        <DocsShell {...shell} title="The C interface" lead={<>Everything the port hands a native mod: <code className="text-gold">openrac_mod.h</code>. A mod is built against this header alone. Each item says which interface version added it; check <code className="text-gold">api-&gt;api_minor</code> before you use something newer than your manifest&apos;s <code className="text-gold">api</code></>} toc={cToc(r)}>
          <LangMemory lang="c" />
          <CReference r={r} />
          {source("sdk/include/openrac/openrac_mod.h")}
        </DocsShell>
      );
    case "cpp":
      return (
        <DocsShell {...shell} title="The C++ layer" lead={<>A header-only C++17 layer over the C interface: <code className="text-gold">openrac/mod.hpp</code>. It is compiled into your mod; the game still sees only the C table</>} toc={cppToc(r)}>
          <LangMemory lang="cpp" />
          <CppReference r={r} />
          {source("sdk/include/openrac/mod.hpp")}
        </DocsShell>
      );
    case "luau":
      return (
        <DocsShell {...shell} title="The Luau API" lead="What a script mod can use: the openrac table. Scripts run in a sandbox with a 2 ms budget per call" toc={luauToc()}>
          <LangMemory lang="luau" />
          <LuauReference r={r} ctx={ctx("sdk/docs/scripts.md")} />
          {source(`sdk/${r.luau!.file}`)}
        </DocsShell>
      );
    case "hooks": {
      const g = r.hooks.find((x) => x.game === page.game)!;
      const stable = g.hooks.filter((h) => !h.experimental).length;
      return (
        <DocsShell
          {...shell}
          title="Hook points"
          lead={<>Functions of {gameName(g.game)} your mod can take over: {g.hooks.length} in all, {stable} of them stable</>}
          toc={[{ id: "explorer", label: "Hook points" }, ...(g.fields.length ? [{ id: "fields", label: "Fields" }] : [])]}
        >
          <section id="explorer" aria-labelledby="explorer-title" className="scroll-mt-20">
            <h2 id="explorer-title" className="sr-only">
              Hook points
            </h2>
            {/* A link to a hook point (#rac1.player.take_damage) lands here; the explorer then picks it. */}
            <div aria-hidden className="h-0 overflow-hidden">
              {g.hooks.map((h) => (
                <span key={h.id || h.name} id={h.id || h.name} className="block scroll-mt-20" />
              ))}
            </div>
            <HookExplorer hooks={g.hooks} game={g.game} discs={g.discs} manifestHref={docsHref(version, "tools/manifest", latest)} scripts={!!r.luau} />
          </section>
          {g.fields.length > 0 && (
            <section id="fields" className="mt-12 grid scroll-mt-20 gap-3">
              <h2 className="text-[19px] font-semibold text-hi">Fields</h2>
              <p className="max-w-[760px] text-[15px] text-body">
                Game state a script reads and writes by name: <code className="text-gold">openrac.fields.{g.fields[0].name}</code>. <b className="text-hi">Experimental:</b> these name the game&apos;s internals and follow the decompilation.
              </p>
              <div tabIndex={0} className="d-card overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[12.5px] font-medium text-dim">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Name</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">What it is</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.fields.map((f) => (
                      <tr key={f.name} id={`field-${f.name}`} className="scroll-mt-20 border-t border-line target:bg-amber/10">
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-[13px] text-gold">{f.name}</td>
                        <td className="px-4 py-2 font-mono text-[13px] text-hi">
                          {f.type}
                          {f.readonly ? <span className="ml-2 font-sans text-[12px] text-dim">read-only</span> : null}
                        </td>
                        <td className="px-4 py-2 text-body">{f.about}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {source(r.hookNames[g.game] ? `sdk/bindings/${g.game}.json` : `sdk/include/openrac/games/${g.game}.h`)}
        </DocsShell>
      );
    }
    case "manifest": {
      const md = r.guides.find((x) => x.slug === "manifest")?.markdown ?? "";
      return (
        <DocsShell {...shell} title="Manifest builder" lead={<>Every mod has an <code className="text-gold">openrac-mod.json</code>. Fill in the form or paste your own: it is checked as you type, by the rules of the newest SDK{md ? <>. Each field is explained in <a href={docsHref(version, "manifest", latest)} className="text-amber underline">the manifest guide</a></> : null}</>}>
          <Suspense fallback={<div className="d-card h-[640px] animate-pulse" />}>
          <ManifestBuilder
            iface={r.interface}
            sdk={r.version}
            rules={latest}
            games={r.hooks.length ? r.hooks.map((x) => ({ game: x.game, discs: x.discs.length ? x.discs : ["pal", "ntsc"] })) : [{ game: "rac1", discs: ["pal", "ntsc"] }]}
            keys={r.keys}
            hookNames={r.hookNames}
            hookIds={r.hooks.flatMap((x) => x.hooks.filter((h) => h.id && !h.experimental).map((h) => h.id))}
            help={manifestHelp(md)}
            guide={md ? docsHref(version, "manifest", latest) : undefined}
            examples={manifestExamples(md)}
          />
          </Suspense>
        </DocsShell>
      );
    }
    case "changelog": {
      const releases = index.versions.map((v) => getRelease(v.version));
      const removed = releases.some((x) => Object.values(x.changes.api).some((d) => d.removed.length));
      return (
        <DocsShell
          {...shell}
          title="Changelog"
          lead={<>Every SDK release, newest first. A minor version only adds to the interface, so a mod built for 1.2 still loads on 1.11. Something is removed only with a new major version{removed ? "" : ". Nothing has been removed so far"}</>}
          toc={releases.map((x) => ({ id: `v${x.version}`, label: x.version }))}
        >
          <Changelog releases={releases} latest={latest} />
        </DocsShell>
      );
    }
  }
}

