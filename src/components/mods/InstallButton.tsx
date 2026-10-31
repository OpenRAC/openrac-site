"use client";

import { useRef, useState } from "react";
import { installUrl, intentUrl, type Wanted } from "@/lib/mods/logic";
import Sheet from "./Sheet";

const DOWNLOAD = "/#download";

const arrow = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 flex-none fill-none stroke-current stroke-2">
    <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Chrome on Android gets an intent:// link, which falls back to the download page by itself. */
const isAndroidChrome = () => /android/i.test(navigator.userAgent) && /chrome\//i.test(navigator.userAgent) && !/firefox|samsungbrowser/i.test(navigator.userAgent);

/**
 * Opens the launcher on its install screen through the openrac:// link. A browser cannot tell whether
 * an app took the link, so if the page still has focus shortly after, it offers what to do instead:
 * get the launcher, or copy the link for Mods → Add from a link.
 */
export default function InstallButton({
  mods,
  label = "Install",
  small = false,
  primary = true,
  devOnly = false,
  className = "",
  onInstalled,
}: {
  mods: Wanted[];
  label?: string;
  small?: boolean;
  primary?: boolean;
  devOnly?: boolean;
  className?: string;
  onInstalled?: () => void;
}) {
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState<"" | "ok" | "no">("");
  const timer = useRef<number | undefined>(undefined);
  const url = installUrl(mods);

  const open = () => {
    const absolute = new URL(DOWNLOAD, location.href).href;
    const left = () => {
      window.clearTimeout(timer.current);
      removeEventListener("blur", left);
      document.removeEventListener("visibilitychange", left);
    };
    addEventListener("blur", left);
    document.addEventListener("visibilitychange", left);
    timer.current = window.setTimeout(() => {
      left();
      if (document.visibilityState === "visible" && document.hasFocus()) setHelp(true);
    }, 1600);
    location.href = isAndroidChrome() ? intentUrl(mods, absolute) : url;
    onInstalled?.();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("no");
    }
  };

  return (
    <>
      <button type="button" onClick={open} className={`btn ${primary ? "btn-primary" : ""} ${small ? "btn-sm" : ""} ${className}`}>
        {arrow}
        {label}
      </button>
      <Sheet
        open={help}
        onClose={() => {
          setHelp(false);
          setCopied("");
        }}
        title="Didn't open?"
        actions={
          <a href={DOWNLOAD} className="btn btn-primary" onClick={() => setHelp(false)}>
            {arrow}
            Get the launcher
          </a>
        }
      >
        <div className="grid gap-3 text-soft">
          <p>
            Install opens the <b className="font-semibold text-hi">OpenRAC launcher</b>, which installs the mod and everything it needs. If nothing happened, the launcher is probably not installed yet.
          </p>
          {devOnly && (
            <p className="rounded-xl border-l-4 border-amber bg-amber/10 px-4 py-3 text-[15px]">
              This mod needs the <b className="text-gold">dev build</b> of the launcher. Each system in the download panel has a <b className="text-gold">DEV</b> link for it.
            </p>
          )}
          <p className="text-[15px]">Already have it? Try again, or copy the link and paste it in the launcher under Mods → Add from a link.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => (setHelp(false), open())}>
              Try again
            </button>
            <button type="button" className="btn btn-sm" onClick={copy}>
              {copied === "ok" ? "Copied" : "Copy link"}
            </button>
          </div>
          {copied === "no" && (
            <p className="text-[14px]">
              Your browser blocked copying. The link is: <code className="select-all break-all rounded bg-ink-deep px-1.5 py-0.5 text-gold">{url}</code>
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
