import type { PlatformId } from "./releases.ts";

/**
 * The system a browser runs on, from its user agent (and `navigator.userAgentData.platform` when it
 * has one), or null for one the launcher is not built for (iPhone, iPad) or cannot be told.
 */
export function detectPlatform(userAgent: string, platform = ""): PlatformId | null {
  const s = `${platform} ${userAgent}`;
  if (/iphone|ipad|ipod/i.test(s)) return null;
  if (/android/i.test(s)) return "android";
  if (/windows|win32|win64/i.test(s)) return "windows";
  if (/mac ?os|macintosh/i.test(s)) return "macos";
  if (/linux|cros|x11/i.test(s)) return "linux";
  return null;
}
