import DownloadPanel from "@/components/sections/DownloadPanel";
import { DOWNLOAD_URL } from "@/lib/projects";
import { noFiles, type LauncherRelease } from "@/lib/releases";

/** The launcher's latest release, one card per system, folded until a Download button opens it. */
export default function Download({ release }: { release: LauncherRelease | null }) {
  return <DownloadPanel release={release} platforms={release?.platforms ?? noFiles()} fallback={DOWNLOAD_URL} />;
}
