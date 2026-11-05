"use client";

import { useState } from "react";

/** The "#" beside a heading: it goes to the section and copies its address, to paste in a chat or an issue. */
export default function HeadingAnchor({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section (copies it)"
      onClick={() => {
        navigator.clipboard?.writeText(`${location.origin}${location.pathname}#${id}`).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      className="ml-2 text-dim no-underline opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-60"
    >
      #{copied && <span className="ml-1.5 align-middle text-[12px] font-normal text-amber">link copied</span>}
    </a>
  );
}
