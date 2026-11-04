import { ImageResponse } from "next/og";
import { getNewsWeek } from "@/lib/news";
import { formatWeekName, formatWeekRange, isNewsWeek } from "@/lib/news/logic";

export const alt = "A weekly news report on OpenRAC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview for a week: its headline on the site's ink and gold, as on the mod pages. */
export default async function Image(props: { params: Promise<{ week: string }> }) {
  const { week } = await props.params;
  const data = isNewsWeek(week) ? await getNewsWeek(week) : null;
  const report = data?.report.status === "ok" ? data.report.report : null;
  const headline = report?.headline ?? "What happened this week";
  const when = data ? `${formatWeekName(week)} · ${formatWeekRange(data.facts.start, data.facts.end)}` : "Weekly news";
  const corner = (pos: Record<string, number>, sides: string) => (
    <div style={{ position: "absolute", width: 70, height: 70, borderColor: "#f5c040", borderStyle: "solid", borderWidth: sides, ...pos }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 80, background: "linear-gradient(135deg, #1a1a24, #0d0d14)", color: "#f4f4f8" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "repeating-linear-gradient(-55deg, #d6a020, #d6a020 18px, #b98a1a 18px, #b98a1a 36px)" }} />
        {corner({ top: 50, left: 50 }, "6px 0 0 6px")}
        {corner({ bottom: 50, right: 50 }, "0 6px 6px 0")}
        <div style={{ position: "absolute", top: 70, right: 80, fontSize: 34, fontWeight: 800, color: "#f5c040" }}>OpenRAC News</div>
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#d6a020", textTransform: "uppercase", fontWeight: 700 }}>{when}</div>
        <div style={{ fontSize: headline.length > 70 ? 62 : headline.length > 38 ? 76 : 96, fontWeight: 800, lineHeight: 1.08, marginTop: 18, maxWidth: 1000 }}>{headline}</div>
        {report && <div style={{ fontSize: 30, color: "#b4b4bf", marginTop: 22, maxWidth: 980 }}>{`by @${report.author} with ${report.tool}`}</div>}
      </div>
    ),
    size,
  );
}
