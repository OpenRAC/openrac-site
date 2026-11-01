import { getLauncherRelease, type PlatformId } from "@/lib/releases";

const PLATFORMS: PlatformId[] = ["windows", "macos", "linux", "android"];
const RELEASES_PAGE = "https://github.com/OpenRAC/OpenRAC/releases/latest";

/**
 * A system's launcher from the latest release (openrac.dev/download/macos): a redirect to its main
 * file, looked up when the link is followed, like the dev builds' links. A short address to share
 * that always lands on the current release, or on its page when the file is not there.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!PLATFORMS.includes(platform as PlatformId)) return new Response("Unknown system", { status: 404 });
  const release = await getLauncherRelease();
  const file = release?.platforms.find((p) => p.id === platform)?.main;
  return Response.redirect(file?.url ?? release?.url ?? RELEASES_PAGE, 302);
}
