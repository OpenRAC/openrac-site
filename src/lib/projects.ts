export type ProjectId = "rac1" | "gc" | "uya" | "deadlocked" | "gm" | "sm";

export type ProjectCategory = "mainline" | "spinoff";

export interface Project {
  id: ProjectId;
  name: string;
  year: number;
  /** GitHub "owner/name" of the community project, if one exists. */
  repo?: string;
  /** Tailwind class for the card's typeface. */
  fontClass: string;
  /** Card colours, exposed to CSS as custom properties. */
  theme: { box: string; border: string; text: string; text2: string; from: string; to: string };
  /** Optional backdrop in /public/img (not shipped in the repository, see README). */
  image: string;
  /** Mainline console entry vs handheld/mobile spin-off. */
  category?: ProjectCategory;
  /** Primary platform of the original release. */
  platform?: string;
  /** Optional subtitle for the card header (defaults to "decompilation · {year}"). */
  subtitle?: string;
  /** Short tag used in activity feeds and badges. */
  tag?: string;
  /** Release the project works from, e.g. "PAL". */
  region?: string;
  /** GitHub user names of the people who run the project, shown on its card: the work is theirs. */
  maintainers?: string[];
  /**
   * "research": the project is still mapping the game and setting up its toolchain. Its card says so,
   * but its progress is read and shown exactly like every other project's.
   */
  phase?: "research";
  /** Where to start contributing (the "Contribute" buttons). Defaults to the repository. */
  contributing?: string;
  /** The project's own best introduction for newcomers, listed under Resources. */
  guide?: { label: string; url: string };
}

const GH = "https://github.com";

export const PROJECTS: readonly Project[] = [
  {
    id: "rac1",
    name: "Ratchet & Clank",
    year: 2002,
    repo: "OpenRAC/rac1-decomp",
    fontClass: "font-audiowide",
    theme: { box: "#181820", border: "#747669", text: "#c8d2ff", text2: "#9ca1d4", from: "#3c7a3a", to: "#12331f" },
    image: "/img/rac1-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "RaC1",
    maintainers: ["Lynder063", "Veradictus"],
    region: "PAL",
    contributing: `${GH}/OpenRAC/rac1-decomp/blob/main/CONTRIBUTING.md`,
    guide: { label: "From assembly to a match", url: `${GH}/OpenRAC/rac1-decomp/blob/main/docs/WORKFLOW.md` },
  },
  {
    id: "gc",
    name: "Going Commando",
    year: 2003,
    repo: "OpenRAC/rac2-gc-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "#101a2a", border: "#5a7fa6", text: "#9fd3ff", text2: "#6fa8d6", from: "#7a4d1a", to: "#2a1a0c" },
    image: "/img/gc-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "GC",
    maintainers: ["llesieur99", "platypet2217-star"],
    contributing: `${GH}/OpenRAC/rac2-gc-decomp/blob/master/CONTRIBUTING.md`,
    guide: { label: "Start here", url: `${GH}/OpenRAC/rac2-gc-decomp/blob/master/README.md` },
  },
  {
    id: "uya",
    name: "Up Your Arsenal",
    year: 2004,
    repo: "OpenRAC/rac3-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "rgba(98,66,27,.8)", border: "#a0742e", text: "#ebbe67", text2: "#c99a45", from: "#25514f", to: "#0d1f24" },
    image: "/img/uya-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "UYA",
    maintainers: ["Lynder063", "Veradictus"],
    region: "PAL",
    contributing: `${GH}/OpenRAC/rac3-decomp/blob/master/CONTRIBUTING.md`,
    guide: { label: "Start here", url: `${GH}/OpenRAC/rac3-decomp/blob/master/docs/wiki/Home.md` },
  },
  {
    id: "deadlocked",
    name: "Ratchet: Deadlocked",
    year: 2005,
    repo: "OpenRAC/rac4-decomp",
    fontClass: "font-orbitron font-bold",
    theme: { box: "#12151b", border: "#b91c1c", text: "#f3f4f6", text2: "#ef4444", from: "#7f1d1d", to: "#0f1115" },
    image: "/img/deadlocked-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "DL",
    maintainers: ["Lynder063"],
    region: "NTSC-U",
    contributing: `${GH}/OpenRAC/rac4-decomp/blob/main/CONTRIBUTING.md`,
    guide: { label: "Research notes", url: `${GH}/OpenRAC/rac4-decomp/blob/main/docs/RESEARCH.md` },
  },
  {
    id: "gm",
    name: "Going Mobile",
    year: 2005,
    repo: "Clank700/going-mobile-decomp",
    fontClass: "font-pixel",
    theme: { box: "rgba(0, 36, 51, 0.92)", border: "#00f0ff", text: "#00f0ff", text2: "#7dd3fc", from: "#021c2d", to: "#010811" },
    image: "/img/going-mobile-bg.webp",
    category: "spinoff",
    platform: "Mobile (J2ME)",
    subtitle: "Java reconstruction · 2005 · J2ME",
    tag: "GM",
    maintainers: ["Clank700"],
    guide: { label: "Build and verify", url: `${GH}/Clank700/going-mobile-decomp#readme` },
  },
  {
    id: "sm",
    name: "Size Matters",
    year: 2008,
    repo: "OpenRAC/rac5-sm-decomp",
    fontClass: "font-chakra font-semibold",
    theme: { box: "#1b2936", border: "#eab308", text: "#f8fafc", text2: "#facc15", from: "#223342", to: "#131d26" },
    image: "/img/size-matters-bg.webp",
    category: "spinoff",
    platform: "PlayStation 2",
    subtitle: "decompilation · 2008 · NTSC-U · PS2 port",
    tag: "SM",
    maintainers: ["llesieur99"],
    region: "NTSC-U",
    contributing: `${GH}/OpenRAC/rac5-sm-decomp/blob/master/CONTRIBUTING.md`,
    guide: { label: "Roadmap and status", url: `${GH}/OpenRAC/rac5-sm-decomp/blob/master/docs/ROADMAP.md` },
  },
];

/**
 * Other community projects for a game listed above. They are named in the FAQ ("Are the other titles
 * being worked on?") but have no card and are not tracked on the page.
 */
export const ALSO_WORKED_ON: readonly { game: ProjectId; repo: string; region?: string }[] = [
  { game: "rac1", repo: "lombyte-project/Lombyte", region: "NTSC-U" },
];

export const DISCORD_URL = "https://discord.gg/Sfd2B54PDG";

/** The launcher's newest release: GitHub sends this address on to whichever one is latest, so it never needs changing. */
export const DOWNLOAD_URL = "https://github.com/OpenRAC/OpenRAC/releases/latest";
