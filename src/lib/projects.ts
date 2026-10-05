export type ProjectId = "rac1" | "lombyte" | "gc" | "uya" | "gm";

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
  /** Release the project works from, e.g. "PAL". Shown when a game has more than one project. */
  region?: string;
  /**
   * Set on another project for a game that already has a card: it is shown as a second tab
   * on that card instead of a card of its own, and the game is counted once.
   */
  sameGameAs?: ProjectId;
}

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
    region: "PAL",
  },
  {
    id: "lombyte",
    name: "Ratchet & Clank",
    year: 2002,
    repo: "lombyte-project/Lombyte",
    fontClass: "font-audiowide",
    theme: { box: "#181820", border: "#747669", text: "#c8d2ff", text2: "#9ca1d4", from: "#3c7a3a", to: "#12331f" },
    image: "/img/rac1-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "Lombyte",
    region: "NTSC-U",
    sameGameAs: "rac1",
  },
  {
    id: "gc",
    name: "Going Commando",
    year: 2003,
    repo: "llesieur99/rac2-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "#101a2a", border: "#5a7fa6", text: "#9fd3ff", text2: "#6fa8d6", from: "#7a4d1a", to: "#2a1a0c" },
    image: "/img/gc-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "GC",
  },
  {
    id: "uya",
    name: "Up Your Arsenal",
    year: 2004,
    repo: "OpenRAC/rac3-uya-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "rgba(98,66,27,.8)", border: "#a0742e", text: "#ebbe67", text2: "#c99a45", from: "#25514f", to: "#0d1f24" },
    image: "/img/uya-bg.webp",
    category: "mainline",
    platform: "PlayStation 2",
    tag: "UYA",
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
  },
];

export const DISCORD_URL = "https://discord.gg/Sfd2B54PDG";
