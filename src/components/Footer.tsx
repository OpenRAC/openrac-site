import Link from "next/link";
import { DISCORD_URL } from "@/lib/projects";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-deep py-8 text-[13px] text-dim">
      <div className="mx-auto max-w-[1080px] px-4">
        <p className="max-w-[820px]">
          OpenRAC · unofficial community project · <Link className="text-amber" href="/blog">Blog</Link> · <Link className="text-amber" href="/#legal">Legal</Link> ·{" "}
          <a className="text-amber" href="https://github.com/OpenRAC">GitHub</a> · <a className="text-amber" href={DISCORD_URL}>Discord</a>
        </p>
        <p className="mt-2 max-w-[820px]">
          Progress is read from the projects&apos; repositories on the server and refreshed every ten minutes. For scripts and AI tools:{" "}
          <a className="text-amber" href="/progress.json">progress.json</a> · <a className="text-amber" href="/llms.txt">llms.txt</a>
        </p>
      </div>
    </footer>
  );
}
