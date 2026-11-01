import Link from "next/link";
import { PAGE_TRANSITION } from "@/components/layout/PageTransition";
import Section from "@/components/ui/Section";
import ModCard from "@/components/mods/ModCard";
import { getModCatalog } from "@/lib/mods";
import { isWithdrawn, renderedAt, sortMods } from "@/lib/mods/logic";
import { slim } from "@/lib/mods/slim";

/** "Mods" on the home page: the three most active mods and the way to the rest. Nothing when none are listed. */
export default async function ModsTeaser() {
  const { catalog } = await getModCatalog();
  if (!catalog.mods.length) return null;
  const now = renderedAt();
  const mods = catalog.mods.filter((m) => !isWithdrawn(catalog.revoked, m.id)).map((m) => slim(m, catalog)).filter((m) => m.works !== "none");
  const picked = (mods.some((m) => m.featured) ? mods.filter((m) => m.featured) : sortMods(mods, "trending", now)).slice(0, 3);
  return (
    <Section id="mods" title="Mods" sub={`${mods.length} community mods for the PC port. Install one and the launcher adds everything it needs.`}>
      <div className="grid gap-4 min-[480px]:grid-cols-2 min-[821px]:grid-cols-3 sm:gap-5">
        {picked.map((m) => (
          <ModCard key={m.id} mod={m} now={now} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/mods" transitionTypes={PAGE_TRANSITION} className="btn">
          Browse all mods
        </Link>
        <Link href="/mods/submit" className="btn">
          Publish your mod
        </Link>
      </div>
    </Section>
  );
}
