/**
 * The home page's title-screen clips: short cinematic free-camera flights through the games the
 * launcher plays. Like the card backdrops they are game footage, so they are not
 * in the repository: they are served from IMAGE_DIR (see lib/images), each in these files:
 *
 *   <file>-1080.webm   AV1, 1920x1080
 *   <file>-1080.mp4    H.264, 1920x1080, for browsers without AV1
 *   <file>.webp        the first frame, shown while the clip loads and with reduced motion
 */
export type HeroShot = { game: string; place: string; file: string };

export const HERO_SHOTS: readonly HeroShot[] = [
  { game: "Ratchet & Clank", place: "Metropolis, Kerwan", file: "hero-rac1-kerwan" },
  { game: "Ratchet & Clank", place: "Jowai Resort, Pokitaru", file: "hero-rac1-pokitaru" },
  { game: "Ratchet & Clank", place: "Blarg Depot, Gaspar", file: "hero-rac1-gaspar" },
];

export const HERO_FILES = ["-1080.webm", "-1080.mp4", ".webp"] as const;
export type HeroFile = (typeof HERO_FILES)[number];

/** "/img/hero-rac1-kerwan-1080.mp4". */
export const heroSrc = (shot: HeroShot, kind: HeroFile) => `/img/${shot.file}${kind}`;
