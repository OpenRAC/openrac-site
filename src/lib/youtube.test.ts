import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVideoId } from "./youtube-parse.ts";

const ID = "dQw4w9WgXcQ";

test("parseVideoId understands the usual link shapes", () => {
  for (const u of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    ID,
    `  ${ID}  `,
  ]) assert.equal(parseVideoId(u), ID, u);
});

test("parseVideoId rejects anything else", () => {
  for (const u of ["", "nope", "https://example.com/watch?v=" + ID, "https://www.youtube.com/watch", "https://www.youtube.com/channel/UC123", `https://evil.test/youtu.be/${ID}`, "https://youtu.be/short"])
    assert.equal(parseVideoId(u), null, u);
});
