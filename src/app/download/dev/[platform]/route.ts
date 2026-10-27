import { DEV_PAGE, getDevBuild, type PlatformId } from "@/lib/releases";

/**
 * A system's newest development build: a redirect to its file, looked up when the link is followed.
 * The APK's name changes with every build, so a link written into a cached page could already be
 * gone; this one always lands on the current file, or on the release page if there is none.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const dev = await getDevBuild();
  return Response.redirect(dev?.files[platform as PlatformId]?.url ?? DEV_PAGE, 302);
}
