"use client";

import type { CSSProperties } from "react";
import { TRUST_LABEL, TRUSTS } from "@/lib/mods/logic";
import { TrustBadge } from "./Badges";
import Sheet from "./Sheet";
import { useIntroSeen } from "./store";

const READ_MORE = "https://github.com/OpenRAC/openrac-mods#labels";

/**
 * "Before you install mods": once per browser, on the first visit to the list. What the four labels mean,
 * the risk of a mod that runs code, and that OpenRAC takes no responsibility. "Show only checked mods"
 * turns on the Checked by OpenRAC filter. The "?" by that filter opens it again (`reopen`).
 */
export default function ModsIntro({ onCheckedOnly, reopen = false, onClose }: { onCheckedOnly: () => void; reopen?: boolean; onClose?: () => void }) {
  const [seen, markIntroSeen] = useIntroSeen();
  const markSeen = () => {
    markIntroSeen();
    onClose?.();
  };
  return (
    <Sheet
      open={seen === false || reopen}
      onClose={markSeen}
      title="Before you install mods"
      close={false}
      actions={
        <>
          <a href={READ_MORE} className="self-center whitespace-nowrap py-2 text-[14px] text-amber min-[480px]:mr-auto" rel="noopener">
            Read more
          </a>
          <button
            type="button"
            className="btn whitespace-nowrap"
            onClick={() => {
              onCheckedOnly();
              markSeen();
            }}
          >
            Show only checked mods
          </button>
          <button type="button" className="btn btn-primary whitespace-nowrap" onClick={markSeen}>
            I understand
          </button>
        </>
      }
    >
      <p className="text-[15px] text-soft">Mods are made by people in the community, not by OpenRAC. Each one shows how much we checked it.</p>
      <ul className="mt-4 grid">
        {TRUSTS.map((t, i) => (
          <li key={t} style={{ "--i": i + 1 } as CSSProperties} className="m-in grid items-center gap-x-6 gap-y-1 border-t border-line py-3 text-[14px] text-soft first:border-0 min-[480px]:grid-cols-[140px_1fr]">
            <span className="justify-self-start">
              <TrustBadge trust={t} big edge />
            </span>
            <span>{TRUST_LABEL[t].hint}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg border-l-2 border-coral bg-coral/10 px-4 py-3 text-[14px] leading-relaxed text-soft">
        <b className="text-hi">The risk:</b> a mod marked <b className="text-hi">⚠ Runs code</b> is a program. A bad one could harm your computer, your files or your accounts. Script mods run in a sandbox and can only change the game.
      </p>
      <p className="mt-3 px-1 text-[14px] leading-relaxed text-dim">
        <b className="text-hi">OpenRAC takes no responsibility</b> for what any mod does, checked or not. You install mods at your own risk.
      </p>
    </Sheet>
  );
}
