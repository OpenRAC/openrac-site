import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUya, parseSizes, UYA_TEXT_BYTES } from "./uya.ts";

// Synthetic input: 120 C functions, 7 verified assembly ones, 3 still to do,
// plus things a naive parser would trip over.
const cFuncs = Array.from(
  { length: 120 },
  (_, i) => `void func_${(0x400000 + i).toString(16).toUpperCase().padStart(8, "0")}(void) {\n}\n`,
).join("");
const textC = `
/* func_00999999(void) { this is a comment, not a function } */
${cFuncs}
ASM_FUNC("asm/handwritten", func_00500000);
ASM_FUNC("asm/handwritten", func_00500010);
LINKER_REMNANT("asm/remnants", func_00500020);
LINKER_REMNANT("asm/remnants", func_00500030);
LINKER_REMNANT("asm/remnants", func_00500040);
LINKER_REMNANT("asm/remnants", func_00500050);
LINKER_REMNANT("asm/remnants", func_00500060);
INCLUDE_ASM("asm/nonmatchings/text", func_00600000);
INCLUDE_ASM("asm/nonmatchings/text", func_00600010);
INCLUDE_ASM("asm/nonmatchings/text", func_00600020);
`;
// 880 functions more are needed to pass the sanity threshold, so pad with verified asm.
const padded = textC + Array.from({ length: 900 }, (_, i) => `ASM_FUNC("x", func_0070${i.toString().padStart(4, "0")});\n`).join("");
const tsv = "function\taddress\tsize\tbucket\nfunc_00600000\t0x00600000\t0x100\tplain\nfunc_00600010\t0x00600010\t0x40\tplain\nfunc_00600020\t0x00600020\t0x10\tswitch\nfunc_00ABCDEF\t0x00ABCDEF\t0x999\tplain\n";

test("parseSizes reads hex sizes by column name", () => {
  const m = parseSizes(tsv);
  assert.equal(m.get("func_00600000"), 0x100);
  assert.equal(m.size, 4);
});

test("computeUya counts C, verified assembly and remaining separately", () => {
  const p = computeUya(padded, tsv);
  assert.ok(p);
  assert.equal(p.functions.total, 120 + 907 + 3);
  assert.equal(p.functions.done, 120 + 907);
  // func_00ABCDEF is in the tsv but no longer INCLUDE_ASM in text.c, so it must not count.
  assert.equal(p.code.done, UYA_TEXT_BYTES - (0x100 + 0x40 + 0x10));
  assert.match(p.note ?? "", /120 in C/);
});

test("computeUya refuses input it does not understand", () => {
  assert.equal(computeUya("<html>404</html>", tsv), null);
  assert.equal(computeUya(padded, "garbage"), null);
});
