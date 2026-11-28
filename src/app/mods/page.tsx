import type { Metadata } from "next";
import { Suspense } from "react";
import PageTransition from "@/components/layout/PageTransition";
import Boundary from "@/components/ui/Boundary";
import ModBrowser from "@/components/mods/ModBrowser";
import { SHARE_IMAGE, ldJson, modsIndexLd, siteUrl } from "@/lib/machine";
import { getModCatalog } from "@/lib/mods";
import { isShown, renderedAt, sortMods } from "@/lib/mods/logic";
import { CONTENT_RULES, LIST_YOUR_MOD, SDK_DOCS } from "@/lib/mods/links";
import { slim } from "@/lib/mods/slim";

// Static, rebuilt in the background at most every 5 minutes, like the home page.
export const revalidate = 300;

const title = "Ratchet & Clank PC Mods";
const description =
  "Community mods for OpenRAC, the native PC port of Ratchet & Clank: randomizers, controls, speedrun tools and more. Install in one click; the launcher adds what a mod needs and keeps it up to date.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Ratchet & Clank mods",
    "Ratchet & Clank PC",
    "Ratchet & Clank PC port",
    "Ratchet and Clank PC port",
    "Ratchet & Clank modding",
    "Ratchet 1 mods",
    "Going Commando mods",
    "Up Your Arsenal mods",
    "Deadlocked mods",
    "OpenRAC mods",
    "OpenRAC",
    "mods",
    "randomizer",
    "Archipelago",
    "PC port",
    "PS2",
  ],
  alternates: { canonical: "/mods", types: { "application/json": "/mods.json" } },
  openGraph: { title: `${title} · OpenRAC`, description, url: "/mods", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description, images: [SHARE_IMAGE] },
};


/** While the list wakes up: skeleton blocks where the menu, the tabs and the rows will be. As tall as a
 * screen and more, so the footer never moves into view as the list arrives. */
function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the mod list" className="mx-auto min-h-[150vh] max-w-[1360px] px-4 pb-16 pt-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12 lg:pl-6 lg:pr-10 xl:pr-14">
      <div className="grid content-start gap-2 max-lg:hidden">
        <span className="skeleton h-6 w-32" />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="skeleton mt-2 h-6" />
        ))}
      </div>
      <div className="grid content-start gap-4">
        <span className="skeleton h-11" />
        <span className="skeleton h-9 w-72" />
        <span className="skeleton mt-4 h-9 w-80" />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton h-24" />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton mt-2 h-14" />
        ))}
      </div>
    </div>
  );
}

/** The mod list, framed like the SDK docs: a game at a time, then how to publish a mod. */
export default async function ModsPage() {
  const { catalog } = await getModCatalog();
  const now = renderedAt();
  const mods = catalog.mods.filter((m) => isShown(m, catalog.revoked)).map((m) => slim(m, catalog));
  const trending = sortMods(mods, "trending", now);

  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(modsIndexLd(siteUrl(), trending)) }} />
      {/* As tall as a screen and more, so the footer below never moves into view as the list arrives. */}
      <Suspense fallback={<ListSkeleton />}>
        <Boundary what="mod list">
          <ModBrowser
            mods={mods}
            now={now}
            picks={catalog.picks?.games ?? {}}
            notice={
              catalog.stale && (
                <p className="mb-6 rounded-lg border-l-2 border-brand bg-brand/10 px-4 py-3 text-[14.5px] text-soft">
                  {mods.length ? "The mod list may be a little out of date: GitHub did not answer just now. It refreshes by itself." : "The mod list could not be loaded just now. It refreshes by itself; try again in a minute."}
                </p>
              )
            }
          >
            <section id="publish" className="mt-14 scroll-mt-6 border-t border-line pt-8">
              <h2 className="text-[18px] font-semibold text-hi">Publish your mod</h2>
              <p className="mt-1 text-[15px] text-soft">Players install it in one click, and every new release reaches them by itself.</p>
              <ol className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ["Build it with the SDK", "Write a script in Luau, or a native mod in C or C++. A template sets it all up.", <a key="a" className="text-amber" href={SDK_DOCS}>SDK docs</a>],
                  ["Release it on GitHub", "Push a version tag. The template builds the mod and publishes the release for you.", null],
                  ["List it once", "Fill in a short form on GitHub. A bot checks the mod and tells you what to fix. Then every new release shows up here within an hour.", <a key="c" className="text-amber" href={LIST_YOUR_MOD}>Open the submission on GitHub</a>],
                ].map(([t, d, a], i) => (
                  <li key={i} className="d-card grid content-start gap-1.5 p-4">
                    <span className="text-[12.5px] text-dim">Step {i + 1}</span>
                    <span className="font-semibold text-hi">{t}</span>
                    <span className="text-[14px] text-soft">{d}</span>
                    {a && <span className="text-[14px]">{a}</span>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[14px] text-dim">
                Every listing follows the <a href={CONTENT_RULES} className="text-amber underline">content rules</a>.
              </p>
            </section>
          </ModBrowser>
        </Boundary>
      </Suspense>
    </PageTransition>
  );
}
