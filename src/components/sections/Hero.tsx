import { formatSize } from "@/lib/format";
import { PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "@/components/ui/CountUp";
import Particles from "@/components/ui/Particles";
import Logo from "@/components/ui/Logo";
import styles from "./Hero.module.css";

/** The top of the home page: headline, the two main buttons and four headline numbers. */
export default function Hero({ progress, mods }: { progress: Partial<Record<ProjectId, ProjectProgress>>; mods: number }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  return (
    <div className={styles.hero}>
      <Particles />
      <div aria-hidden className={styles.atmosphere} />

      <div className={styles.main}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            Unofficial · open source · community driven
          </p>
          <h1 className={styles.title}>
            <span className={styles.titleGold}>Ratchet &amp; Clank</span>{" "}
            <span>series, rebuilt from</span>{" "}
            <span>the original bytes.</span>
          </h1>
          <p className={styles.description}>
            OpenRAC is a hub for community decompilation projects of the Ratchet &amp; Clank series. Each project reconstructs readable source code that compiles to the
            same bytes as the original game, one function at a time, in the open.
          </p>
          <div className={styles.actions}>
            {/* Keep the existing download-panel trigger and native progress anchor. */}
            <a id="download-button" href="#download" aria-controls="download" className={`btn btn-primary ${styles.download}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 flex-none fill-none stroke-current stroke-2">
                <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download the launcher
            </a>
            <a href="#progress" className={styles.secondary}>
              See progress <span aria-hidden>↗</span>
            </a>
          </div>
        </div>

        {/* The existing OpenRAC mark, framed as a mechanical seal. All decoration, no extra data. */}
        <div className={styles.emblem} aria-hidden="true">
          <div className={styles.emblemGrid} />
          <div className={styles.orbitOuter} />
          <div className={styles.orbitInner} />
          <div className={styles.emblemFace}>
            <Logo mark accent label="" height={230} className={styles.mark} />
          </div>
          <span className={styles.nodeTop} />
          <span className={styles.nodeBottom} />
          <span className={styles.crossTop}>+</span>
          <span className={styles.crossBottom}>+</span>
        </div>
      </div>

      <div className={`${styles.stats} ${!mods ? styles.threeStats : ""}`}>
        {[
          [<CountUp key="t" value={new Set(PROJECTS.map((p) => p.name)).size} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          // Left out while the mod list cannot be read, rather than claiming none.
          ...(mods ? [[<CountUp key="m" value={mods} />, "community mods"]] : []),
          [<span key="b">{formatSize(bytes)}</span>, "of code verified across projects"],
        ].map(([value, label], i) => (
          <div key={i} className={styles.stat}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.scrollRail}>
        <a href="#progress" aria-label="Scroll to explore progress" className={styles.scrollCue}>
          <span className={styles.scrollWords}>
            <span>Continue below</span>
            <strong>Progress</strong>
          </span>
          <span className={styles.scrollIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m6 6 6 6 6-6m-12 6 6 6 6-6" /></svg>
          </span>
        </a>
      </div>
    </div>
  );
}
