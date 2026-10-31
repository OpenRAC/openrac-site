"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's own choices on the mod pages, kept in this browser: the mods picked for a set (shared
 * by the list and each mod page) and the preferred view. Storage may be blocked (private windows,
 * blocked site data): then nothing is kept and everything still works for the visit.
 */

const PICKED = "openrac.mods.picked";
const VIEW = "openrac.mods.view";
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Another tab changing the set shows here too.
  const onStorage = (e: StorageEvent) => (e.key === PICKED || e.key === VIEW) && l();
  addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    removeEventListener("storage", onStorage);
  };
}

const EMPTY: string[] = [];
let cache: { raw: string | null; value: string[] } = { raw: null, value: EMPTY };

function pickedSnapshot(): string[] {
  const raw = read(PICKED);
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const v = JSON.parse(raw ?? "[]");
    if (Array.isArray(v)) value = v.filter((x): x is string => typeof x === "string");
  } catch {}
  cache = { raw, value };
  return value;
}

export function usePicked(): [string[], (next: string[]) => void] {
  const picked = useSyncExternalStore(subscribe, pickedSnapshot, () => EMPTY);
  return [picked, (next) => write(PICKED, JSON.stringify([...new Set(next)]))];
}

export function useStoredView(): ["grid" | "list" | null, (v: "grid" | "list") => void] {
  const v = useSyncExternalStore(
    subscribe,
    () => read(VIEW),
    () => null,
  );
  return [v === "list" || v === "grid" ? v : null, (next) => write(VIEW, next)];
}
