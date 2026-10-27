import DownloadPanel from "@/components/sections/DownloadPanel";
import SectionArt from "@/components/ui/SectionArt";
import { DOWNLOAD_URL } from "@/lib/projects";
import { noFiles, type DevBuild, type LauncherRelease } from "@/lib/releases";

/** The launcher's latest release and development build, one card per system, folded until a Download button opens it. */
export default function Download({ release, dev }: { release: LauncherRelease | null; dev: DevBuild | null }) {
  return <DownloadPanel release={release} dev={dev} platforms={release?.platforms ?? noFiles()} fallback={DOWNLOAD_URL} art={<SectionArt id="download" className="h-14 w-auto sm:h-[76px]" />} />;
}
