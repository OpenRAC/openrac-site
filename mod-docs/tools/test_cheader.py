"""cheader.py on a header shaped like the SDK's: sections, runs of constants, shared comments."""

import unittest

import cheader

HEADER = """/* SPDX-License-Identifier: MIT
 *
 * The interface.
 */
#ifndef OPENRAC_MOD_H
#define OPENRAC_MOD_H

/* ------------------------------------------------------------------------------------------ *
 * Basic types (since 1.2)
 *
 * What a mod sees first.
 * ------------------------------------------------------------------------------------------ */

/* The results of hook. Since 1.0. */
#define OPENRAC_HOOK_OK 0
/* No such hook point. */
#define OPENRAC_HOOK_UNKNOWN (-1)

/* A callback. Since 1.1. */
typedef void (*openrac_frame_fn)(void* user);

typedef struct openrac_api {
    /* Read a setting. Since 1.0. */
    int (*setting_bool)(openrac_mod* mod, const char* key);
    int64_t (*setting_int)(openrac_mod* mod, const char* key);

    /* Takes a hook point. Returns OPENRAC_HOOK_OK. Since 1.0. */
    int (*hook)(
        openrac_mod* mod,
        const char* name
    );
    uint8_t keys[512];
} openrac_api;

/* A typed value. Since 1.0. */
#define OPENRAC_GREF(api, T, a) (*(T*)OPENRAC_G(api, a))
#endif
"""


class Parse(unittest.TestCase):
    def setUp(self):
        self.h = cheader.parse(HEADER)
        self.items = self.h["sections"][0]["items"]

    def test_intro_and_section(self):
        self.assertEqual(self.h["intro"], "The interface.")
        s = self.h["sections"][0]
        self.assertEqual((s["title"], s["since"], s["about"]), ("Basic types", "1.2", "What a mod sees first."))

    def test_constants_run_together(self):
        run = self.items[0]
        self.assertEqual(run["kind"], "constants")
        self.assertEqual([c["name"] for c in run["items"]], ["OPENRAC_HOOK_OK", "OPENRAC_HOOK_UNKNOWN"])
        self.assertEqual(run["items"][1]["values"], ["(-1)"])

    def test_callback(self):
        cb = self.items[1]
        self.assertEqual((cb["kind"], cb["name"], cb["since"]), ("callback", "openrac_frame_fn", "1.1"))
        self.assertEqual(cb["params"], [{"type": "void*", "name": "user"}])

    def test_members_share_a_comment(self):
        api = self.items[2]
        groups = [[m["name"] for m in g["members"]] for g in api["groups"]]
        self.assertEqual(groups, [["setting_bool", "setting_int"], ["hook", "keys"]])
        hook = api["groups"][1]["members"][0]
        self.assertEqual(hook["params"], [{"type": "openrac_mod*", "name": "mod"}, {"type": "const char*", "name": "name"}])
        self.assertEqual(api["groups"][1]["members"][1], {"kind": "field", "name": "keys", "decl": "uint8_t keys[512]", "type": "uint8_t[512]"})

    def test_macro(self):
        m = self.items[3]
        self.assertEqual((m["kind"], m["name"], m["params"]), ("macro", "OPENRAC_GREF", ["api", "T", "a"]))

    def test_since_is_the_dating_sentence(self):
        self.assertEqual(cheader.since("Shows a page. Since 1.9 also on the main menu. Since 1.7."), "1.7")
        self.assertEqual(cheader.since("Since 1.2: returns whether ..."), "1.2")
        self.assertEqual(cheader.since("No version."), None)
        self.assertEqual(cheader.since("Shows this page (or since 1.9 a main-menu item's page)."), None)


if __name__ == "__main__":
    unittest.main()
