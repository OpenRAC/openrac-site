/** Which interface version added an item; marked when it is new in the release shown. */
export default function Since({ since, iface }: { since?: string | null; iface: string }) {
  if (!since) return null;
  const fresh = since === iface;
  return (
    <span
      title={fresh ? `New in interface ${since}` : `Added in interface ${since}`}
      className={fresh ? "badge badge-new" : "badge"}
    >
      {fresh ? "New " : "Since "}
      {since}
    </span>
  );
}

/** A small label: Experimental, Read-only, ... */
export function Tag({ children, tone = "quiet" }: { children: React.ReactNode; tone?: "quiet" | "warn" }) {
  return (
    <span className={`inline-flex flex-none items-center badge ${tone === "warn" ? "border-brand/60 text-brand" : "border-white/15 text-dim"}`}>
      {children}
    </span>
  );
}
