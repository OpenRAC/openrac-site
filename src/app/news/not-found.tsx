import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";

/** A week, day or project with no news: a real 404, with the way back. */
export default function NewsNotFound() {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="news" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">No news for that</h1>
      <p className="max-w-[480px] text-soft">The address may be mistyped, or that day may not have finished yet: days end at midnight UTC</p>
      <Link href="/news" className="btn btn-primary">
        All news
      </Link>
    </main>
  );
}
