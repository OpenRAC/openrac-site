---
title: "Up Your Arsenal: the road to the main menu"
date: 2026-10-08
summary: Three of Up Your Arsenal's executables now rebuild byte for byte from source, over 90% of the functions on the way to the main menu are done, and the goal for this year is a fully decompiled main menu running natively on PC.
tags: [uya, progress, decompilation]
draft: false
---

The *Ratchet & Clank: Up Your Arsenal* decompilation (NTSC-U, SCUS-97353) has grown a lot since it started. A
few weeks ago it covered one file. Today it covers everything the game runs between switching on the console
and showing the main menu. This post is a look at where things stand, what we learned on the way, and what we
are aiming for by the end of the year.

## Three executables, byte for byte

The game boots through three programs, and all three now rebuild from this repository into files that are
identical to retail, byte for byte:

| File | What it is | SHA-1 of the rebuilt file |
|---|---|---|
| `i5bootn.elf` | the launcher the disc starts first | `71f3ecfc…` |
| `boot_elf.elf` | the main executable: the engine core and Sony's libraries | `48797530…` |
| `frontbin.elf` | the front end: the menus | `3bc94ee8…` |

"Byte for byte" is the rule for every change: the build checks the result against the original's hash, and the
continuous integration build fails on anything that doesn't match. A function only counts as done when it is C (or
assembly the original was also written in) that compiles to exactly the original instructions.

## The numbers

Counted on the repository's `main` branch on October 8:

| Executable | Functions | Done | Written in C | Still assembly |
|---|---|---|---|---|
| frontbin (front end) | 1,867 | 96.4% | 1,419 | 67 |
| boot_elf (engine core + front end copy) | 2,791 | 88.3% | 1,779 | 327 |
| i5bootn (launcher) | 199 | 97.0% | 37 | 6 |
| **Menu, all three** | **4,857** | **91.8%** | **3,235** | **400** |

"Done" includes the functions that were hand-written assembly in the original (Sony's system-call stubs, VU0
routines, startup code) and the leftover bytes of functions the original linker removed. Those are finished as
assembly, because that is what they were. Weighted by size, about four fifths of the menu's code is done; the
functions that are left are the big ones. The live numbers, with a separate **Menu** progress bar, are on the
project's [decomp.dev](https://decomp.dev/OpenRAC/rac3-uya-decomp) page.

## What we learned on the way

**Which compiler.** Matching only works with the exact compiler the developers used. A test of 15 PlayStation 2
compiler builds against code we had already matched showed that the front end was built with SN Systems'
ee-gcc 2.95.3 (v1.36). The same test on the launcher turned up something nicer: one file can mix compilers.
Insomniac's own code uses SN's compiler, while the libraries that came with Sony's SDK were built with Sony's
own ee-gcc 2.9-ee. The game even links GCC's runtime library, and those functions rebuild unchanged from GCC
2.95's published source, with one small change Sony made because the PS2's floating point unit has no
denormal numbers.

**One front end, twice.** The main executable carries a second copy of the front end at different addresses.
Instead of matching it again, a tool pairs every function with its twin, translates the addresses and moves
the finished C across. More than 1,300 functions were matched that way in one go, and every frontbin match
since then can be carried over the same way.

**The small stuff adds up.** A lot of the work is in details that have nothing to do with the C itself: nops
the original assembler put in front of short loops to dodge a hardware bug, padding between objects, which
global variables the compiler reaches through the `$gp` register, and per-file compiler flags. Each of those is
now written down in the project's [Matching patterns](https://github.com/OpenRAC/rac3-uya-decomp/blob/main/docs/wiki/Matching-Patterns.md)
page, so the next person doesn't have to find it again.

## The plan: the main menu, natively, by the end of the year

A byte-matching decompilation is the foundation, not the finish line. The goal for the end of 2026 is a main
menu that is fully decompiled and runs natively on PC. Getting there takes three steps:

1. **Finish the decompilation of the menu path.** The 400 functions left are mostly the large ones, plus a
   few groups that need tooling work first: the engine core's read-only data has to be split per source file
   before its `switch` statements can become C, and a handful of library functions were built with compilers
   that only exist as Linux programs.
2. **Understand what the menu actually needs.** The front end calls into the main executable for drawing,
   loading files, reading the controller, sound and memory cards. Mapping that boundary tells us exactly which
   parts of the engine a PC version has to bring along.
3. **Replace the PlayStation 2 underneath.** The PS2 draws through its Graphics Synthesizer and vector units,
   plays sound on a separate processor and reads everything from the disc. A native build needs PC versions of
   those pieces: a renderer, file loading from your own copy of the game, input and audio. The decompiled C
   stays the same game logic; only the hardware layer changes.

It is an ambitious target, and we will report honestly along the way, including what turns out to be harder
than expected.

## Join in

Everything you need to set up, match a function and send it in is in the
[repository](https://github.com/OpenRAC/rac3-uya-decomp) and its
[contributing guide](https://github.com/OpenRAC/rac3-uya-decomp/blob/main/CONTRIBUTING.md). The project ships
its own tools: a local web editor that compiles one function and shows the difference from the original as you
type, plus scripts that sort the remaining functions by what they need. You need your own copy of the game;
the repository contains no game code or data.

Questions are welcome in our [Discord](https://discord.gg/Sfd2B54PDG).
