import type { Metadata } from "next";
import Section from "@/components/ui/Section";
import SubmitWizard from "@/components/mods/SubmitWizard";
import { getModCatalog } from "@/lib/mods";
import { CONTENT_RULES, INDEX_REPO, SDK_DOCS } from "@/lib/mods/links";
import { latest } from "@/lib/mods/logic";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Publish your mod",
  description: "List your OpenRAC mod so players can install it in one click. Paste your repository, fix what the checklist shows, and send it.",
  alternates: { canonical: "/mods/submit" },
};

/** Listing a mod: a checklist against the repository, then GitHub's submission form, filled in. */
export default async function SubmitPage() {
  const { catalog } = await getModCatalog();
  const mods = catalog.mods.filter((m) => m.type !== "pack").map((m) => ({ id: m.id, name: m.name, version: latest(m, catalog.revoked)?.version ?? m.versions[0].version }));
  return (
    <main className="mx-auto max-w-[1080px] px-4 pt-6">
      <Section id="publish" title="Publish your mod" sub="You need only a GitHub account: no git, no JSON. Once listed, every new release reaches players by itself.">
        <SubmitWizard indexRepo={INDEX_REPO} tags={catalog.tags} mods={mods} />
        <p className="mt-6 text-[14px] text-dim">
          Not made yet? Start with the <a href={SDK_DOCS} className="text-amber">SDK docs</a>. Every listing follows the <a href={CONTENT_RULES} className="text-amber">content rules</a>.
        </p>
      </Section>
    </main>
  );
}
