import type { Metadata } from "next";
import { Suspense } from "react";
import PageTransition from "@/components/layout/PageTransition";
import Boundary from "@/components/ui/Boundary";
import Cards from "@/components/ui/Cards";
import Particles from "@/components/ui/Particles";
import Section from "@/components/ui/Section";
import InstallButton from "@/components/mods/InstallButton";
import ModBrowser from "@/components/mods/ModBrowser";
import ModCard from "@/components/mods/ModCard";
import { SHARE_IMAGE, ldJson, modsIndexLd, siteUrl } from "@/lib/machine";
import { getModCatalog } from "@/lib/mods";
import { isFresh, isWithdrawn, renderedAt, sortMods } from "@/lib/mods/logic";
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
  keywords: ["Ratchet & Clank mods", "Ratchet & Clank PC", "OpenRAC", "mods", "randomizer", "Archipelago", "PC port", "PS2"],
  alternates: { canonical: "/mods", types: { "application/json": "/mods.json" } },
  openGraph: { title: `${title} · OpenRAC`, description, url: "/mods", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description, images: [SHARE_IMAGE] },
};


/** The mod list: featured mods, what is new, then every mod to browse, and how to publish one. */
export default async function ModsPage() {
  const { catalog } = await getModCatalog();
  const now = renderedAt();
  const mods = catalog.mods.filter((m) => !isWithdrawn(catalog.revoked, m.id)).map((m) => slim(m, catalog));
  const trending = sortMods(mods, "trending", now);
  // The picked ones, or the most active when none are picked; never sliding by itself.
  const featured = (mods.some((m) => m.featured) ? mods.filter((m) => m.featured) : trending).slice(0, 3);
  const fresh = sortMods(mods.filter((m) => isFresh(m, now) && !featured.includes(m)), "updated", now).slice(0, 8);

  return (
    <PageTransition>
    <main className="mx-auto max-w-[1080px] px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(modsIndexLd(siteUrl(), trending)) }} />

      <div className="relative isolate pb-2 pt-10 sm:pb-4 sm:pt-14">
        <Particles />
        <div aria-hidden className="absolute -right-56 -top-24 -z-10 size-[680px] bg-[radial-gradient(closest-side,rgb(214_160_32/0.28),transparent)] will-change-transform sm:animate-drift" />
        <p className="mb-4 whitespace-nowrap font-orbitron text-[clamp(7px,2.35vw,11px)] font-bold uppercase tracking-[.2em] text-brand after:mt-2 after:block after:h-[3px] after:w-11 after:rounded-sm after:bg-brand after:content-[''] sm:text-[13px] sm:tracking-[.28em]">
          Community made · one-click install
        </p>
        <h1 className="max-w-[860px] text-balance font-audiowide text-[clamp(30px,5.6vw,56px)] leading-[1.06]">
          <span className="animate-shine bg-gradient-to-r from-amber via-[#e8a317] to-gold bg-[length:220%_100%] bg-clip-text text-transparent">Mods</span> for the Ratchet &amp; Clank port.
        </h1>
        <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-soft sm:text-[17px]">
          Made by the community for OpenRAC. Press <b className="font-semibold text-hi">Install</b> and the launcher adds the mod with everything it needs, checks every file, and keeps it up to date.
        </p>
        <div className="mt-6 grid animate-rise gap-3 [animation-delay:.3s] min-[560px]:flex min-[560px]:flex-wrap">
          <a href="#all" className="btn btn-primary">
            Browse {mods.length ? `${mods.length} mods` : "mods"}
          </a>
          <a href="#publish" className="btn">
            Publish your mod
          </a>
        </div>
      </div>

      {catalog.stale && (
        <p className="mb-2 rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 text-[15px] text-soft">
          {mods.length ? "The mod list may be a little out of date: GitHub did not answer just now. It refreshes by itself." : "The mod list could not be loaded just now. It refreshes by itself; try again in a minute."}
        </p>
      )}

      {featured.length > 0 && (
        <Section id="featured" title="Featured" sub="Picked by the community: a good place to start.">
          <div className="grid gap-4 min-[480px]:grid-cols-2 min-[821px]:grid-cols-3">
            {featured.map((m, i) => (
              <ModCard key={m.id} mod={m} now={now} priority={i === 0} actions={<InstallButton mods={[{ id: m.id }]} small primary={false} devOnly={m.works !== "release"} />} />
            ))}
          </div>
        </Section>
      )}

      {fresh.length > 0 && (
        <Section id="fresh" title="New & updated" sub="Released or updated in the last two weeks.">
          {/* A row to swipe through, snapping to each card; it never moves by itself. A scrolling row also
              clips up and down, so the room above (pt, undone by -mt) keeps a hovered card's lifted border in view. */}
          <div className="-mx-4 -mt-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:thin]">
            {fresh.map((m) => (
              <div key={m.id} className="w-[min(280px,80vw)] flex-none snap-start">
                <ModCard mod={m} now={now} sizes="280px" />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section id="all" title="All mods" sub="Search, filter and compare. Pick several to install them together, with everything they need.">
        <Suspense fallback={<div className="surface h-[420px] animate-pulse" />}>
          <Boundary what="mod list">
            <ModBrowser mods={mods} tags={catalog.tags} now={now} />
          </Boundary>
        </Suspense>
      </Section>

      <Section id="publish" title="Publish your mod" sub="Players install it in one click, and every new release reaches them by itself.">
        <Cards
          items={[
            ["Build it with the SDK", "Script mods in Luau, native mods in C or C++, data packs from the level editor. The templates set everything up.", <a key="a" className="btn btn-sm" href={SDK_DOCS}>SDK docs</a>],
            ["Release it on GitHub", "Tag a version: the template's workflow builds every system, packs the archives and writes SHA256SUMS.", null],
            ["List it once", "All you need is a GitHub account. Fill in the form and a bot answers on the issue, with each problem and its fix. After that each release shows up here within the hour.", <a key="c" className="btn btn-sm" href={LIST_YOUR_MOD}>Open the submission on GitHub</a>],
          ]}
        />
        <p className="mt-6 text-[14px] text-dim">
          Every listing follows the <a href={CONTENT_RULES} className="text-amber underline">content rules</a>.
        </p>
      </Section>
    </main>
    </PageTransition>
  );
}
