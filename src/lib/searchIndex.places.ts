import type { Entry } from "./search.ts";

/** The site's own pages and sections: in the full list, and what the search answers before it is in. */
export const PLACES: Entry[] = [
  { t: "Install", k: "Page", h: "/install", d: "Get the OpenRAC launcher for your system.", a: "download launcher setup get play" },
  { t: "Progress", k: "Section", h: "/#progress", d: "How much of each game compiles to the retail bytes.", a: "percent matched status" },
  { t: "Recent activity", k: "Section", h: "/#activity", d: "The latest commits across the projects.", a: "commits github" },
  { t: "Get involved", k: "Section", h: "/#contribute", d: "Ways to help the decompilation projects.", a: "contribute help join" },
  { t: "How it works", k: "Section", h: "/#how", d: "What a matching decompilation is.", a: "matching decompilation explained" },
  { t: "Resources", k: "Section", h: "/#resources", d: "Tools and guides decompilation projects rely on.", a: "tools ghidra splat pcsx2" },
  { t: "FAQ", k: "Section", h: "/#faq", d: "Common questions.", a: "questions answers" },
  { t: "Our view on AI", k: "Section", h: "/#ai", d: "How the projects use AI.", a: "ai llm claude" },
  { t: "Credits", k: "Section", h: "/#credits", d: "Videos about the games we recommend.", a: "youtube videos thanks" },
  { t: "News", k: "Page", h: "/news", d: "Weekly reports from every project.", a: "blog updates changelog weekly" },
  { t: "Mods", k: "Page", h: "/mods", d: "Community mods for the OpenRAC ports.", a: "mod addons plugins" },
  { t: "Make mods (SDK docs)", k: "Page", h: "/mods/docs", d: "Guides and reference for the mod SDK.", a: "sdk api documentation modding develop" },
];
