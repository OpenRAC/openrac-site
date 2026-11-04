import { ImageResponse } from "next/og";

export const alt = "OpenRAC News: what happens across the projects, week by week";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview for the news page, and for the day pages under it. */
export default function Image() {
  const corner = (pos: Record<string, number>, sides: string) => (
    <div style={{ position: "absolute", width: 70, height: 70, borderColor: "#f5c040", borderStyle: "solid", borderWidth: sides, ...pos }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 80, background: "linear-gradient(135deg, #1a1a24, #0d0d14)", color: "#f4f4f8" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "repeating-linear-gradient(-55deg, #d6a020, #d6a020 18px, #b98a1a 18px, #b98a1a 36px)" }} />
        {corner({ top: 50, left: 50 }, "6px 0 0 6px")}
        {corner({ bottom: 50, right: 50 }, "0 6px 6px 0")}
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#d6a020", textTransform: "uppercase", fontWeight: 700 }}>Ratchet &amp; Clank · Weekly reports</div>
        <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1.02, marginTop: 18 }}>OpenRAC News</div>
        <div style={{ fontSize: 32, color: "#b4b4bf", marginTop: 22, maxWidth: 980 }}>What happens across the projects, week by week.</div>
      </div>
    ),
    size,
  );
}
