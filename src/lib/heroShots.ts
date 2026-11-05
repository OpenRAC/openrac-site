/**
 * The home page's title-screen clips: short cinematic free-camera flights through the games the
 * launcher plays, recorded in 4K. Like the card backdrops they are game footage, so they are not
 * in the repository: they are served from IMAGE_DIR (see lib/images), each in these files:
 *
 *   <file>-2160.webm   AV1, 3840x2160, for 4K and high density screens
 *   <file>-1080.webm   AV1, 1920x1080
 *   <file>-1080.mp4    H.264, 1920x1080, for browsers without AV1
 *   <file>.webp        the first frame, shown while the clip loads and with reduced motion
 */
export type HeroShot = { game: string; place: string; file: string };

export const HERO_SHOTS: readonly HeroShot[] = [
  { game: "Ratchet & Clank", place: "Metropolis, Kerwan", file: "hero-rac1-kerwan" },
  { game: "Going Commando", place: "Endako", file: "hero-rac2-endako" },
  { game: "Ratchet & Clank", place: "Blackwater City, Rilgar", file: "hero-rac1-rilgar" },
  { game: "Going Commando", place: "Notak", file: "hero-rac2-notak" },
  { game: "Ratchet & Clank", place: "Pokitaru", file: "hero-rac1-pokitaru" },
  { game: "Going Commando", place: "Oozla", file: "hero-rac2-oozla" },
  { game: "Ratchet & Clank", place: "Novalis", file: "hero-rac1-novalis" },
  { game: "Going Commando", place: "Tabora", file: "hero-rac2-tabora" },
];

export const HERO_FILES = ["-2160.webm", "-1080.webm", "-1080.mp4", ".webp"] as const;
export type HeroFile = (typeof HERO_FILES)[number];

/** "/img/hero-rac1-kerwan-1080.mp4". */
export const heroSrc = (shot: HeroShot, kind: HeroFile) => `/img/${shot.file}${kind}`;
