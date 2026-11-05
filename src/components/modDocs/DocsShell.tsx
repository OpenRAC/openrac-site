import Link from "next/link";
import type { ReactNode } from "react";
import PageTransition from "@/components/layout/PageTransition";
import { docsHref, type Page } from "@/lib/modDocs/logic";
import type { ReleaseIndex } from "@/lib/modDocs/types";
import Search from "./Search";
import Logo from "@/components/ui/Logo";
import Toc from "./Toc";
import VersionSwitcher, { type VersionOption } from "./VersionSwitcher";

const GROUPS: Page["group"][] = ["Start", "Guides", "Reference", "Try it", "Releases"];

const itemClass = (on: boolean) => `flex min-h-8 items-center rounded-md px-3 text-[14px] no-underline transition-colors ${on ? "bg-amber/12 font-semibold text-amber" : "text-soft hover:bg-white/5 hover:text-hi"}`;

function Nav({ pages, current, version, latest }: { pages: Page[]; current: string; version: string; latest: string }) {
  return (
    <nav aria-label="Docs" className="grid gap-4">
      {GROUPS.map((g) => {
        const items = pages.filter((p) => p.group === g);
        if (!items.length) return null;
        // Pages that share a parent ("Hook points": one per game) fold under it.
        const rows: (Page | { parent: string; children: Page[] })[] = [];
        for (const p of items) {
          if (!p.parent) rows.push(p);
          else {
            const last = rows.find((r) => "children" in r && r.parent === p.parent) as { parent: string; children: Page[] } | undefined;
            if (last) last.children.push(p);
            else rows.push({ parent: p.parent, children: [p] });
          }
        }
        return (
          <div key={g}>
            <p className="mb-1.5 px-3 text-[12.5px] font-semibold text-dim">{g}</p>
            <ul className="grid gap-0.5">
              {rows.map((r) =>
                "children" in r ? (
                  <li key={r.parent}>
                    <details open={r.children.some((c) => c.path === current)} className="group/nav">
                      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between rounded-md px-3 text-[14px] text-soft transition-colors hover:bg-white/5 hover:text-hi">
                        {r.parent}
                        <span aria-hidden className="text-[11px] text-dim transition-transform group-open/nav:rotate-90">
                          ▶
                        </span>
                      </summary>
                      <ul className="ml-3 mt-0.5 grid gap-0.5 border-l border-line pl-2">
                        {r.children.map((c) => (
                          <li key={c.path}>
                            <a href={docsHref(version, c.path, latest)} aria-current={c.path === current ? "page" : undefined} className={itemClass(c.path === current)}>
                              {c.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ) : (
                  <li key={r.path}>
                    <a href={docsHref(version, r.path, latest)} aria-current={r.path === current ? "page" : undefined} className={itemClass(r.path === current)}>
                      {r.title}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Every docs page: the menu of the release's pages with the version and the search on the left (a
 * folding menu on phones), the page in the middle, and its contents on the right on wide screens.
 */
export default function DocsShell({
  index,
  versions,
  version,
  pages,
  page,
  title,
  lead,
  toc = [],
  children,
}: {
  index: ReleaseIndex;
  versions: VersionOption[];
  version: string;
  pages: Page[];
  page: Page;
  title: ReactNode;
  lead?: ReactNode;
  toc?: { id: string; label: string; depth?: number }[];
  children: ReactNode;
}) {
  const latest = index.latest;
  const old = version !== latest;
  const at = pages.indexOf(page);
  const prev = at > 0 ? pages[at - 1] : null;
  const next = at >= 0 && at < pages.length - 1 ? pages[at + 1] : null;
  const label = (p: Page) => (p.parent ? `${p.parent}: ${p.title}` : p.title);
  const controls = <VersionSwitcher versions={versions} current={version} path={page.path} latest={latest} />;
  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)_200px]">
        <aside aria-label="Docs menu" className="hidden lg:block">
          <div className="sticky top-4 grid max-h-[calc(100vh-32px)] gap-6 overflow-y-auto pb-6 pr-1 [scrollbar-width:thin]">
            <div className="flex items-center gap-3 px-3">
              <Link href="/" className="inline-flex flex-none text-text no-underline opacity-90 hover:opacity-100" aria-label="OpenRAC home">
                <Logo height={24} label="" accent />
              </Link>
              <span aria-hidden className="h-5 w-px bg-white/15" />
              <a href={docsHref(version, "", latest)} className="text-[14.5px] font-medium text-soft no-underline hover:text-hi">
                SDK docs
              </a>
            </div>
            {controls}
            <Nav pages={pages} current={page.path} version={version} latest={latest} />
          </div>
        </aside>

        <div className="min-w-0">
          <header>
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <Link href="/" className="inline-flex flex-none text-text no-underline" aria-label="OpenRAC home">
                <Logo height={22} label="" accent />
              </Link>
              <span aria-hidden className="h-5 w-px bg-white/15" />
              <a href={docsHref(version, "", latest)} className="text-[14.5px] font-medium text-soft no-underline hover:text-hi">
                SDK docs
              </a>
            </div>
            <div className="mb-4">
              <Search version={version} />
            </div>
            <details className="d-card mb-5 lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-hi">
                <span>
                  Docs menu <span className="font-normal text-dim">· {label(page)}</span>
                </span>
                <span className="plus text-xl leading-none text-amber transition-transform">+</span>
              </summary>
              <div className="grid gap-5 border-t border-line p-4">
                {controls}
                <Nav pages={pages} current={page.path} version={version} latest={latest} />
              </div>
            </details>
          </header>

          <main id="content">
            {old && (
              <p className="mb-5 rounded-lg border-l-2 border-brand bg-brand/10 px-4 py-3 text-[14.5px] text-soft">
                You are reading the docs of SDK {version}, an older release.{" "}
                <a href={docsHref(latest, pages.some((p) => p.path === page.path) ? page.path : "", latest)} className="font-semibold text-amber underline">
                  See the latest ({latest})
                </a>
                .
              </p>
            )}
            <header className="mb-6">
              <p className="mb-1.5 text-[13px] text-dim">
                {page.group} · SDK {version}
              </p>
              <h1 className="text-balance text-[26px] sm:text-[30px] leading-[1.12] text-hi font-semibold tracking-tight">{title}</h1>
              {lead && <div className="mt-3 max-w-[720px] text-[15.5px] leading-relaxed text-soft">{lead}</div>}
            </header>
            {children}
          </main>

          <nav aria-label="Next and previous page" className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            {prev ? (
              <a href={docsHref(version, prev.path, latest)} className="d-card d-card-link block p-3.5 no-underline">
                <span className="text-[12px] text-dim">Previous</span>
                <span className="block font-semibold text-hi">← {label(prev)}</span>
              </a>
            ) : (
              <span />
            )}
            {next && (
              <a href={docsHref(version, next.path, latest)} className="d-card d-card-link block p-4 text-right no-underline">
                <span className="text-[12px] text-dim">Next</span>
                <span className="block font-semibold text-hi">{label(next)} →</span>
              </a>
            )}
          </nav>
        </div>

        {toc.length > 1 && (
          <aside aria-label="Contents" className="hidden xl:block">
            <Toc items={toc} />
          </aside>
        )}
      </div>
    </PageTransition>
  );
}
