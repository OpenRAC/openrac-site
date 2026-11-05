"use client";

import { useRouter } from "next/navigation";
import { docsHref } from "@/lib/modDocs/logic";

export type VersionOption = { version: string; date: string; iface: string; paths: string[] };

/**
 * Picks the SDK release the docs show. The same page in the other release when it has it, else that
 * release's overview. A plain <select>, so it works with the keyboard and on phones.
 */
export default function VersionSwitcher({ versions, current, path, latest }: { versions: VersionOption[]; current: string; path: string; latest: string }) {
  const router = useRouter();
  return (
    <label className="grid gap-1.5">
      <span className="font-orbitron text-[11px] font-bold uppercase tracking-[.16em] text-dim">SDK version</span>
      <span className="sr-only">Each version is a release of the SDK. The docs show what that release has.</span>
      <select
        className="field w-full"
        value={current}
        onChange={(e) => {
          const to = versions.find((v) => v.version === e.target.value);
          if (!to) return;
          router.push(docsHref(to.version, to.paths.includes(path) ? path : "", latest));
        }}
      >
        {versions.map((v) => (
          <option key={v.version} value={v.version}>
            {v.version}
            {v.version === latest ? " · latest" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
