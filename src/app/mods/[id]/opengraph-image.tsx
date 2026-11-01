import { ImageResponse } from "next/og";
import { getMod } from "@/lib/mods";
import { TYPE_LABEL } from "@/lib/mods/logic";

export const alt = "A mod for Ratchet & Clank on OpenRAC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

/** The link preview for a mod: its name on the site's ink and gold, with the target-frame corners. */
export default async function Image(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { mod } = await getMod(id);
  const name = mod?.name ?? "Mod";
  const corner = (pos: Record<string, number>, sides: string) => (
    <div style={{ position: "absolute", width: 70, height: 70, borderColor: "#3dd6c0", borderStyle: "solid", borderWidth: sides, ...pos }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 80, background: "radial-gradient(circle at 85% 10%, rgba(31,174,155,0.35), #12121a 55%)", color: "#efeff3", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "repeating-linear-gradient(-55deg, #c99222 0 22px, #bd8619 22px 44px)" }} />
        {corner({ top: 50, left: 50 }, "6px 0 0 6px")}
        {corner({ bottom: 50, right: 50 }, "0 6px 6px 0")}
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#1fae9b", textTransform: "uppercase", fontWeight: 700 }}>
          {`Ratchet & Clank · ${mod ? TYPE_LABEL[mod.type] : "Mod"}`}
        </div>
        <div style={{ fontSize: name.length > 22 ? 84 : 110, fontWeight: 800, lineHeight: 1.02, marginTop: 18, maxWidth: 1000 }}>{name}</div>
        <div style={{ fontSize: 32, color: "#b4b4bf", marginTop: 22, maxWidth: 980 }}>{mod ? `by ${mod.author}` : ""}</div>
        <div style={{ position: "absolute", top: 70, right: 80, fontSize: 34, fontWeight: 800, color: "#3dd6c0" }}>OpenRAC Mods</div>
      </div>
    ),
    size,
  );
}
