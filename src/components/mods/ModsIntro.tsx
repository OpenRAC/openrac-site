"use client";

import { TRUST_LABEL, TRUSTS } from "@/lib/mods/logic";
import { TrustBadge } from "./Badges";
import Sheet from "./Sheet";
import { useIntroSeen } from "./store";

const READ_MORE = "https://github.com/OpenRAC/openrac-mods#labels";

/**
 * "Before you install mods": once per browser, on the first visit to the list. What the four labels mean,
 * the risk of a mod that runs code, and that OpenRAC takes no responsibility. "Show only checked mods"
 * turns on the Checked by OpenRAC filter.
 */
export default function ModsIntro({ onCheckedOnly }: { onCheckedOnly: () => void }) {
  const [seen, markSeen] = useIntroSeen();
  return (
    <Sheet
      open={seen === false}
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
      <ul className="mt-4 grid gap-2">
        {TRUSTS.map((t) => (
          <li key={t} className="grid items-center gap-x-4 gap-y-1 rounded-lg bg-raised px-4 py-2.5 text-[14px] text-soft min-[480px]:grid-cols-[150px_1fr]">
            <span className="justify-self-start">
              <TrustBadge trust={t} big edge />
            </span>
            <span>{TRUST_LABEL[t].hint}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] leading-relaxed text-dim">
        <b className="text-hi">The risk:</b> a mod marked <b className="text-hi">⚠ Runs code</b> is a program. A bad one could harm your computer, your files or your accounts. Script mods run in a sandbox and can only change the game.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-dim">
        <b className="text-hi">OpenRAC takes no responsibility</b> for what any mod does, checked or not. You install mods at your own risk.
      </p>
    </Sheet>
  );
}
