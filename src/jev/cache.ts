// Judgment cache in chrome.storage.local. Entry `c:<sha256(depth|url|version)>` -> { judgment, storedAt };
// `cache_index`: [{key, at}] oldest-first for eviction.
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS, STORAGE_KEYS } from "../config";
import type { Judgment, JudgmentDepth } from "../types";

interface Entry {
  judgment: Judgment;
  storedAt: number;
}
type Index = Array<{ key: string; at: number }>;

export async function cacheKey(url: string, depth: JudgmentDepth, readerStateVersion: number): Promise<string> {
  const bytes = new TextEncoder().encode(`${depth}|${url}|${readerStateVersion}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${STORAGE_KEYS.cachePrefix}${hex}`;
}

const loadIndex = async (): Promise<Index> =>
  ((await chrome.storage.local.get(STORAGE_KEYS.cacheIndex))[STORAGE_KEYS.cacheIndex] as Index | undefined) ?? [];

/**
 * One storage read for all urls × depths. Returns url -> judgment, preferring earlier `depths`.
 * Expired entries are dropped (and removed).
 */
export async function getBatch(urls: string[], depths: JudgmentDepth[], version: number): Promise<Record<string, Judgment>> {
  const keys = await Promise.all(urls.flatMap((u) => depths.map((d) => cacheKey(u, d, version))));
  const got = (await chrome.storage.local.get(keys)) as Record<string, Entry | undefined>;
  const now = Date.now();
  const out: Record<string, Judgment> = {};
  const expired: string[] = [];
  urls.forEach((u, i) => {
    for (let d = 0; d < depths.length; d++) {
      const key = keys[i * depths.length + d]!;
      const e = got[key];
      if (!e) continue;
      if (now - e.storedAt > CACHE_TTL_MS) {
        expired.push(key);
        continue;
      }
      out[u] = e.judgment;
      break;
    }
  });
  if (expired.length) await remove(expired);
  return out;
}

export async function get(url: string, depth: JudgmentDepth, version: number): Promise<Judgment | undefined> {
  return (await getBatch([url], [depth], version))[url];
}

/** Store judgments, update the index, evict oldest beyond CACHE_MAX_ENTRIES. */
export async function set(...judgments: Judgment[]): Promise<void> {
  if (!judgments.length) return;
  const now = Date.now();
  const items: Record<string, Entry> = {};
  const fresh: Index = [];
  for (const j of judgments) {
    const key = await cacheKey(j.url, j.depth, j.readerStateVersion);
    items[key] = { judgment: j, storedAt: now };
    fresh.push({ key, at: now });
  }
  // ponytail: insertion-order eviction, no bump on read; TTL covers staleness. Concurrent set() calls can
  // race on the index (chrome.storage has no transactions); worst case an orphan entry or two.
  const index = (await loadIndex()).filter((e) => !(e.key in items)).concat(fresh);
  const evicted = index.splice(0, Math.max(0, index.length - CACHE_MAX_ENTRIES));
  await chrome.storage.local.set({ ...items, [STORAGE_KEYS.cacheIndex]: index });
  if (evicted.length) await chrome.storage.local.remove(evicted.map((e) => e.key));
}

async function remove(keys: string[]): Promise<void> {
  const drop = new Set(keys);
  const index = (await loadIndex()).filter((e) => !drop.has(e.key));
  await chrome.storage.local.remove(keys);
  await chrome.storage.local.set({ [STORAGE_KEYS.cacheIndex]: index });
}

export async function clear(): Promise<void> {
  const index = await loadIndex();
  await chrome.storage.local.remove([...index.map((e) => e.key), STORAGE_KEYS.cacheIndex]);
}

export const count = async (): Promise<number> => (await loadIndex()).length;

export const cache = { get, getBatch, set, clear, count };
