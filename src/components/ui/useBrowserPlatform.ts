"use client";

import { useSyncExternalStore } from "react";
import { detectPlatform } from "@/lib/platform";
import type { PlatformId } from "@/lib/releases";

const noChange = () => () => {};
function browserPlatform(): PlatformId | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return detectPlatform(nav.userAgent, nav.userAgentData?.platform);
}

/** The visitor's system. Known only in the browser: null on the server and in the first render, so hydration matches. */
export function useBrowserPlatform(): PlatformId | null {
  return useSyncExternalStore(noChange, browserPlatform, () => null);
}
