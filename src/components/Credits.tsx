import Image from "next/image";
import { CREDITS, type CreditVideo } from "@/lib/credits";
import { getGithubAvatar } from "@/lib/github";
import { getVideoInfo, type VideoInfo } from "@/lib/youtube";
import Section from "./Section";
import YouTubeFacade from "./YouTubeFacade";

type ShownVideo = VideoInfo & { label?: string };

/** Credits with their videos. Renders nothing while no video is listed. */
export default async function Credits() {
  const credits = await Promise.all(
    CREDITS.map(async (c) => ({
      ...c,
      avatar: c.githubUser ? await getGithubAvatar(c.githubUser) : null,
      infos: (
        await Promise.all(
          c.videos.map(async (v: CreditVideo): Promise<ShownVideo | null> => {
            const info = await getVideoInfo(typeof v === "string" ? v : v.url);
            return info ? { ...info, label: typeof v === "string" ? undefined : v.label } : null;
          }),
        )
      ).filter((v): v is ShownVideo => v !== null),
    })),
  );
  const shown = credits.filter((c) => c.infos.length > 0);
  const thanks = credits.filter((c) => c.infos.length === 0 && (c.url || c.links?.length));
  if (shown.length === 0 && thanks.length === 0) return null;

  return (
    <Section id="credits" title="Credits" sub={shown.length > 0 ? "Want to learn more about the games? We recommend these videos." : undefined}>
      <div className="grid gap-10">
        {shown.map((c) => (
          <div key={c.name}>
            <h3 className="flex items-center gap-3 font-orbitron text-xl font-bold text-gold">
              {c.avatar && <Image src={c.avatar} alt="" width={36} height={36} className="size-9 rounded-full border border-line" />}
              {(c.url ?? c.infos[0].channelUrl) ? <a href={c.url ?? c.infos[0].channelUrl} className="no-underline hover:underline">{c.name}</a> : c.name}
            </h3>
            {c.blurb && <p className="mt-1 max-w-[720px] text-soft">{c.blurb}</p>}
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.infos.map((v) => (
                <YouTubeFacade key={v.id} id={v.id} title={v.title ?? "YouTube video"} thumbnail={v.thumbnail} label={v.label} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {thanks.length > 0 && (
        <p className={`text-soft ${shown.length > 0 ? "mt-10" : ""}`}>
          Also thanks to{" "}
          {thanks.map((c, i) => (
            <span key={c.name}>
              {i > 0 && (i === thanks.length - 1 ? " and " : ", ")}
              {c.avatar && <Image src={c.avatar} alt="" width={32} height={32} className="mx-1 inline-block size-8 rounded-full border border-line align-middle" />}
              {c.url ? <a href={c.url} className="font-semibold text-gold no-underline hover:underline">{c.name}</a> : <b className="font-semibold text-gold">{c.name}</b>}
              {c.blurb ? ` (${c.blurb})` : ""}
              {c.links?.map((l, n) => (
                <span key={l.url}>
                  {n === 0 ? " \u2013 " : " \u00b7 "}
                  <a href={l.url} className="text-amber no-underline hover:underline">{l.label}</a>
                </span>
              ))}
            </span>
          ))}
          .
        </p>
      )}
    </Section>
  );
}
