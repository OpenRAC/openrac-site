import { Arrow, DiscordIcon } from "@/components/ui/icons";
import Cards from "@/components/ui/Cards";
import Section, { SUBHEADING } from "@/components/ui/Section";
import { DISCORD_URL, listName, PROJECTS } from "@/lib/projects";

/** "Get involved": three first steps, then every project's contributing guide in one list. */
export default function Contribute() {
  return (
    <Section id="contribute" title="Get involved" sub="You do not need to be a reverse engineer. Every project here welcomes newcomers.">
      <Cards
        items={[
          [
            "Say hello",
            "Join the Discord, tell us what you are curious about and pick a starting point with people who have done it before.",
            <a key="d" href={DISCORD_URL} className="btn btn-sm btn-discord">
              <DiscordIcon />
              Discord
            </a>,
          ],
          ["Set up", "Follow the setup guide of the project you like. You will need your own legally obtained copy of the game, we never provide one."],
          ["Pick a function", "Take a small one, get it to compile to the same bytes and open a pull request. Reviews, notes and tooling help just as much."],
        ]}
      />
      {/* Every project's contributing guide, as one list rather than a wall of buttons. */}
      <div className="surface mt-5 px-5 pb-2 pt-4 sm:px-6">
        <h3 className={SUBHEADING}>Contribute to</h3>
        <ul className="grid gap-x-8 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {PROJECTS.filter((p) => p.repo).map((p) => (
            <li key={p.id} className="border-t border-line first:border-0 min-[480px]:[&:nth-child(2)]:border-0 lg:[&:nth-child(-n+4)]:border-0">
              <a href={p.contributing ?? `https://github.com/${p.repo}`} className="group flex min-h-11 items-center gap-2.5 py-2 font-semibold text-text no-underline hover:text-amber">
                <i aria-hidden className="size-2 flex-none rounded-full" style={{ background: p.theme.text2 }} />
                <span className="min-w-0 truncate">{listName(p)}</span>
                <Arrow />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
