import Link from "next/link";
import Logo from "./Logo";
import { DISCORD_URL } from "@/lib/projects";

const a = "text-amber no-underline hover:underline";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-deep py-10 text-[13px] text-dim">
      <div className="mx-auto grid max-w-[1080px] gap-5 px-4 sm:grid-cols-[auto_1fr] sm:gap-x-10">
        <Link href="/" aria-label="OpenRAC home" className="w-fit text-hi no-underline opacity-90 hover:opacity-100">
          <Logo height={26} label="" accent />
        </Link>
        <div className="grid gap-2">
          <p className="max-w-[820px]">
            OpenRAC · unofficial community project · <Link className={a} href="/blog">Blog</Link> · <Link className={a} href="/#legal">Legal</Link> ·{" "}
            <a className={a} href="https://github.com/OpenRAC">GitHub</a> · <a className={a} href={DISCORD_URL}>Discord</a>
          </p>
          <p className="max-w-[820px]">
            Progress is read from the projects&apos; repositories on the server and refreshed every ten minutes. For scripts and AI tools:{" "}
            <a className={a} href="/progress.json">progress.json</a> · <a className={a} href="/llms.txt">llms.txt</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
