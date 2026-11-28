import { highlight } from "@/lib/mods/search";

/** Text with the search words marked. */
export default function Marked({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  return (
    <>
      {highlight(text, query).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-amber/20 text-gold">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
