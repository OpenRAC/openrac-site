import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";

/** An unknown mod id: a real 404, with the way back to the list. */
export default function ModNotFound() {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="mods" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">No mod by that name</h1>
      <p className="max-w-[480px] text-dim">It may have been renamed or taken off the list. The mod list has everything that is listed now.</p>
      <Link href="/mods" className="btn btn-primary">
        Browse mods
      </Link>
    </main>
  );
}
