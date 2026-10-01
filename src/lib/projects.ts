export type ProjectId = "rac1" | "gc" | "uya";

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
}

export const PROJECTS: readonly Project[] = [
  {
    id: "rac1",
    name: "Ratchet & Clank",
    year: 2002,
    repo: "Lynder063/rac1-decomp",
    fontClass: "font-audiowide",
    theme: { box: "#181820", border: "#747669", text: "#c8d2ff", text2: "#9ca1d4", from: "#3c7a3a", to: "#12331f" },
    image: "/img/rac1-bg.webp",
  },
  {
    id: "gc",
    name: "Going Commando",
    year: 2003,
    repo: "llesieur99/rac2-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "#101a2a", border: "#5a7fa6", text: "#9fd3ff", text2: "#6fa8d6", from: "#7a4d1a", to: "#2a1a0c" },
    image: "/img/gc-bg.webp",
  },
  {
    id: "uya",
    name: "Up Your Arsenal",
    year: 2004,
    repo: "vetusmagnus/ratchet-uya-decomp",
    fontClass: "font-orbitron font-semibold",
    theme: { box: "rgba(98,66,27,.8)", border: "#a0742e", text: "#ebbe67", text2: "#c99a45", from: "#25514f", to: "#0d1f24" },
    image: "/img/uya-bg.webp",
  },
];

export const DISCORD_URL = "https://discord.gg/Sfd2B54PDG";
